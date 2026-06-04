package router

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/segmentio/kafka-go"
	"github.com/tms/go-engine/internal/publisher"
	"github.com/tms/go-engine/internal/whitelist"
)

type MatchType string

const (
	MatchDeviceAndIP MatchType = "DEVICE_IP"
	MatchDeviceOnly  MatchType = "DEVICE_ONLY"
	MatchIPOnly      MatchType = "IP_ONLY"
	MatchNone        MatchType = "NONE"
)

type Event struct {
	DeviceCode  string                 `json:"device_code"`
	SourceIP    string                 `json:"source_ip"`
	Vendor      string                 `json:"vendor"`
	Message     string                 `json:"message"`
	RawMessage  string                 `json:"raw_message"`
	EventTime   string                 `json:"event_time"`
	Parsed      map[string]interface{} `json:"parsed"`
	ParseStatus string                 `json:"parse_status"`
	ParseError  string                 `json:"parse_error"`
}

type decision struct {
	tenantID   string
	matchType  MatchType
	confidence string
	reason     string
	quarantine bool
}

type Router struct {
	reader          *kafka.Reader
	pub             *publisher.Publisher
	rdb             *redis.Client
	wl              *whitelist.Checker
	inputTopic      string
	quarantineTopic string
}

func New(
	brokers []string,
	consumerGroupID string,
	inputTopic string,
	quarantineTopic string,
	rdb *redis.Client,
	pub *publisher.Publisher,
) *Router {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		GroupID:  consumerGroupID,
		Topic:    inputTopic,
		MinBytes: 1,
		MaxBytes: 10 << 20,
	})

	return &Router{
		reader:          reader,
		pub:             pub,
		rdb:             rdb,
		wl:              whitelist.New(rdb),
		inputTopic:      inputTopic,
		quarantineTopic: quarantineTopic,
	}
}

func (r *Router) Run(ctx context.Context) {
	log.Printf("[router] started. input=%s quarantine=%s", r.inputTopic, r.quarantineTopic)
	for {
		msg, err := r.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("[router] fetch error: %v", err)
			continue
		}

		if err := r.routeOne(ctx, msg); err != nil {
			log.Printf("[router] route error: %v", err)
		}
		_ = r.reader.CommitMessages(ctx, msg)
	}
}

func (r *Router) routeOne(ctx context.Context, msg kafka.Message) error {
	var e Event
	if err := json.Unmarshal(msg.Value, &e); err != nil {
		return r.publishQuarantine(ctx, nil, "INVALID_JSON", "json_unmarshal_failed", msg.Value)
	}

	decision, err := r.classify(ctx, e)
	if err != nil {
		return r.publishQuarantine(ctx, &e, "CLASSIFY_ERROR", err.Error(), msg.Value)
	}

	if decision.quarantine {
		return r.publishQuarantine(ctx, &e, string(decision.matchType), decision.reason, msg.Value)
	}

	payload := map[string]interface{}{
		"tenant_id":   decision.tenantID,
		"device_code": strings.ToUpper(strings.TrimSpace(e.DeviceCode)),
		"source_ip":   strings.TrimSpace(e.SourceIP),
		"vendor":      e.Vendor,
		"event_time":  coalesceEventTime(e.EventTime),
		"message":     e.Message,
		"raw_message": e.RawMessage,
		"parsed":      e.Parsed,
		"parse_status": func() string {
			if e.ParseStatus == "" {
				return "ok"
			}
			return e.ParseStatus
		}(),
		"parse_error": e.ParseError,
		"match_type":  decision.matchType,
		"confidence":  decision.confidence,
	}

	topic := fmt.Sprintf("raw-logs.%s", decision.tenantID)
	return r.pub.PublishJSON(ctx, topic, []byte(decision.tenantID), payload)
}

func (r *Router) classify(ctx context.Context, e Event) (decision, error) {
	deviceCode := strings.ToUpper(strings.TrimSpace(e.DeviceCode))
	sourceIP := strings.TrimSpace(e.SourceIP)

	if deviceCode != "" {
		tenantID, err := r.rdb.Get(ctx, fmt.Sprintf("device_code:%s:tenant", deviceCode)).Result()
		if err != nil && err != redis.Nil {
			return decision{}, fmt.Errorf("device lookup error: %w", err)
		}

		if err == nil {
			if sourceIP != "" {
				allowed, wlErr := r.wl.IsAllowed(ctx, tenantID, sourceIP)
				if wlErr != nil {
					return decision{}, fmt.Errorf("whitelist check error: %w", wlErr)
				}
				if allowed {
					return decision{tenantID: tenantID, matchType: MatchDeviceAndIP, confidence: "HIGH"}, nil
				}
			}
			return decision{tenantID: tenantID, matchType: MatchDeviceOnly, confidence: "MEDIUM"}, nil
		}
	}

	if sourceIP != "" {
		tenantIDs, err := r.rdb.SMembers(ctx, fmt.Sprintf("source_ip:%s:tenants", sourceIP)).Result()
		if err != nil {
			return decision{}, fmt.Errorf("source_ip lookup error: %w", err)
		}
		if len(tenantIDs) == 1 {
			return decision{tenantID: tenantIDs[0], matchType: MatchIPOnly, confidence: "LOW", reason: "device_code_missing_or_unmatched"}, nil
		}
		if len(tenantIDs) > 1 {
			return decision{matchType: MatchNone, quarantine: true, reason: "ambiguous_source_ip"}, nil
		}
	}

	return decision{matchType: MatchNone, quarantine: true, reason: "no_match"}, nil
}

func (r *Router) publishQuarantine(ctx context.Context, e *Event, reasonCode string, reason string, raw []byte) error {
	payload := map[string]interface{}{
		"reason_code": reasonCode,
		"reason":      reason,
		"routed_at":   time.Now().UTC().Format(time.RFC3339Nano),
		"raw":         string(raw),
	}
	if e != nil {
		payload["device_code"] = e.DeviceCode
		payload["source_ip"] = e.SourceIP
		payload["vendor"] = e.Vendor
		payload["event_time"] = coalesceEventTime(e.EventTime)
	}
	return r.pub.PublishJSON(ctx, r.quarantineTopic, nil, payload)
}

func (r *Router) Close() {
	_ = r.reader.Close()
}

func coalesceEventTime(eventTime string) string {
	if strings.TrimSpace(eventTime) != "" {
		return eventTime
	}
	return time.Now().UTC().Format(time.RFC3339Nano)
}
