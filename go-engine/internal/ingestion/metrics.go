package ingestion

import (
	"encoding/json"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// RuntimeMetrics keeps lightweight engine runtime counters for monitoring APIs.
type RuntimeMetrics struct {
	ingestTotal       uint64
	ingestSuccess     uint64
	ingestFailure     uint64
	parseFailure      uint64
	publishFailure    uint64
	latencyTotalNanos uint64
	latencySamples    uint64
	lastIngestAtUnix  int64
	mu                sync.RWMutex
	tenantCountCache  int
}

type MetricsResponse struct {
	Status             string  `json:"status"`
	IngestTotal        uint64  `json:"ingestTotal"`
	IngestSuccess      uint64  `json:"ingestSuccess"`
	IngestFailure      uint64  `json:"ingestFailure"`
	ParseFailure       uint64  `json:"parseFailure"`
	PublishFailure     uint64  `json:"publishFailure"`
	IngestErrorRate    float64 `json:"ingestErrorRate"`
	ParseErrorRate     float64 `json:"parseErrorRate"`
	AvgIngestLatencyMs float64 `json:"avgIngestLatencyMs"`
	LastIngestAt       string  `json:"lastIngestAt"`
	CheckedAt          string  `json:"checkedAt"`
}

func NewRuntimeMetrics() *RuntimeMetrics {
	return &RuntimeMetrics{}
}

func (m *RuntimeMetrics) RecordIngest(latency time.Duration, success bool) {
	atomic.AddUint64(&m.ingestTotal, 1)
	if success {
		atomic.AddUint64(&m.ingestSuccess, 1)
	} else {
		atomic.AddUint64(&m.ingestFailure, 1)
	}
	atomic.AddUint64(&m.latencyTotalNanos, uint64(latency.Nanoseconds()))
	atomic.AddUint64(&m.latencySamples, 1)
	atomic.StoreInt64(&m.lastIngestAtUnix, time.Now().Unix())
}

func (m *RuntimeMetrics) RecordParseFailure() {
	atomic.AddUint64(&m.parseFailure, 1)
}

func (m *RuntimeMetrics) RecordPublishFailure() {
	atomic.AddUint64(&m.publishFailure, 1)
}

func (m *RuntimeMetrics) Snapshot() MetricsResponse {
	total := atomic.LoadUint64(&m.ingestTotal)
	success := atomic.LoadUint64(&m.ingestSuccess)
	ingestFailure := atomic.LoadUint64(&m.ingestFailure)
	parseFailure := atomic.LoadUint64(&m.parseFailure)
	publishFailure := atomic.LoadUint64(&m.publishFailure)
	latencyTotal := atomic.LoadUint64(&m.latencyTotalNanos)
	latencySamples := atomic.LoadUint64(&m.latencySamples)
	lastIngestAtUnix := atomic.LoadInt64(&m.lastIngestAtUnix)

	avgLatencyMs := 0.0
	if latencySamples > 0 {
		avgLatencyMs = float64(latencyTotal) / float64(latencySamples) / float64(time.Millisecond)
	}

	ingestErrorRate := 0.0
	parseErrorRate := 0.0
	if total > 0 {
		ingestErrorRate = (float64(ingestFailure+publishFailure) / float64(total)) * 100
		parseErrorRate = (float64(parseFailure) / float64(total)) * 100
	}

	lastIngestAt := ""
	if lastIngestAtUnix > 0 {
		lastIngestAt = time.Unix(lastIngestAtUnix, 0).UTC().Format(time.RFC3339)
	}

	return MetricsResponse{
		Status:             "ok",
		IngestTotal:        total,
		IngestSuccess:      success,
		IngestFailure:      ingestFailure,
		ParseFailure:       parseFailure,
		PublishFailure:     publishFailure,
		IngestErrorRate:    ingestErrorRate,
		ParseErrorRate:     parseErrorRate,
		AvgIngestLatencyMs: avgLatencyMs,
		LastIngestAt:       lastIngestAt,
		CheckedAt:          time.Now().UTC().Format(time.RFC3339),
	}
}

func (h *Handler) MetricsHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(h.metrics.Snapshot())
}
