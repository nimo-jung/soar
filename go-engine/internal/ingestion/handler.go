package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	tenantctx "github.com/soar/go-engine/internal/context"
	"github.com/soar/go-engine/internal/parsing"
	"github.com/soar/go-engine/internal/publisher"
	"github.com/soar/go-engine/internal/whitelist"
)

// Handler handles incoming log HTTP requests
type Handler struct {
	rdb     *redis.Client
	wl      *whitelist.Checker
	parser  *parsing.Engine
	pub     *publisher.Publisher
	metrics *RuntimeMetrics
}

func NewHandler(rdb *redis.Client, pub *publisher.Publisher) *Handler {
	return &Handler{
		rdb:     rdb,
		wl:      whitelist.New(rdb),
		parser:  parsing.New(rdb),
		pub:     pub,
		metrics: NewRuntimeMetrics(),
	}
}

// AuthenticateAPIKey resolves tenantID from the API Key via Redis
// Redis key pattern: tenant:{id}:api_key -> tenantID
func (h *Handler) resolveAPIKey(ctx context.Context, apiKey string) (string, error) {
	// Pattern: store mapping as "api_key:{hash}" -> tenantID
	// For simplicity, look up by iterating prefixed keys (production: use a dedicated index)
	key := fmt.Sprintf("api_key:%s", apiKey)
	tenantID, err := h.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("invalid API key")
	}
	if err != nil {
		return "", fmt.Errorf("redis error: %w", err)
	}
	return tenantID, nil
}

// IngestHandler is the HTTP endpoint for log ingestion
// Expects: Authorization: Bearer <api_key>
func (h *Handler) IngestHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start := time.Now()

	// Extract API key
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		h.metrics.RecordIngest(time.Since(start), false)
		http.Error(w, "X-API-Key header required", http.StatusUnauthorized)
		return
	}

	// Resolve tenant from API key
	tenantID, err := h.resolveAPIKey(ctx, apiKey)
	if err != nil {
		log.Printf("[ingestion] auth failed: %v", err)
		h.metrics.RecordIngest(time.Since(start), false)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// IP whitelist check
	sourceIP := extractClientIP(r)

	allowed, err := h.wl.IsAllowed(ctx, tenantID, sourceIP)
	if err != nil || !allowed {
		log.Printf("[ingestion][%s] IP blocked: %s", tenantID, sourceIP)
		h.metrics.RecordIngest(time.Since(start), false)
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Read body
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // max 1MB
	if err != nil {
		h.metrics.RecordIngest(time.Since(start), false)
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// Inject tenant context
	ctx = tenantctx.WithTenantID(ctx, tenantID)

	// Apply parsing rules
	enriched, err := h.parser.Apply(ctx, tenantID, body)
	if err != nil {
		log.Printf("[ingestion][%s] parse error: %v", tenantID, err)
		h.metrics.RecordParseFailure()
		// Proceed with raw payload
		_ = json.Unmarshal(body, &enriched)
	}

	// Publish to RedPanda
	if err := h.pub.PublishRawLog(ctx, tenantID, enriched); err != nil {
		log.Printf("[ingestion][%s] publish error: %v", tenantID, err)
		h.metrics.RecordPublishFailure()
		h.metrics.RecordIngest(time.Since(start), false)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	h.metrics.RecordIngest(time.Since(start), true)
	w.WriteHeader(http.StatusAccepted)
}

func extractClientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		candidate := strings.TrimSpace(parts[0])
		if candidate != "" {
			if host, _, err := net.SplitHostPort(candidate); err == nil {
				candidate = host
			}
			return candidate
		}
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil {
		return host
	}

	return strings.TrimSpace(r.RemoteAddr)
}

// HealthHandler for liveness probe
func HealthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
