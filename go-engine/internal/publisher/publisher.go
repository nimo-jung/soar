package publisher

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"
)

// Publisher sends log events to RedPanda topics
type Publisher struct {
	writers map[string]*kafka.Writer
	brokers []string
}

func New(brokers []string) *Publisher {
	return &Publisher{
		writers: make(map[string]*kafka.Writer),
		brokers: brokers,
	}
}

func (p *Publisher) writer(topic string) *kafka.Writer {
	if w, ok := p.writers[topic]; ok {
		return w
	}
	w := &kafka.Writer{
		Addr:                   kafka.TCP(p.brokers...),
		Topic:                  topic,
		Balancer:               &kafka.LeastBytes{},
		AllowAutoTopicCreation: true,
	}
	p.writers[topic] = w
	return w
}

// PublishRawLog sends a raw log to the tenant's raw-logs topic
// Topic naming: raw-logs.{tenantID}
func (p *Publisher) PublishRawLog(ctx context.Context, tenantID string, payload map[string]interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal error: %w", err)
	}

	topic := fmt.Sprintf("raw-logs.%s", tenantID)
	return p.writer(topic).WriteMessages(ctx, kafka.Message{
		Key:   []byte(tenantID),
		Value: data,
	})
}

// PublishGlobalTI sends a TI update to the global topic (consumed by all engines)
func (p *Publisher) PublishGlobalTI(ctx context.Context, payload map[string]interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal error: %w", err)
	}
	return p.writer("ti.global.updates").WriteMessages(ctx, kafka.Message{
		Value: data,
	})
}

func (p *Publisher) Close() {
	for _, w := range p.writers {
		_ = w.Close()
	}
}
