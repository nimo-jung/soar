package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/segmentio/kafka-go"
)

const (
	batchSize    = 500
	batchTimeout = 5 * time.Second
)

// Consumer reads from RedPanda and batch-inserts into ClickHouse
type Consumer struct {
	reader  *kafka.Reader
	chConn  driver.Conn
	tenantID string
}

func New(brokers []string, tenantID, clickhouseAddr, chUser, chPassword string) (*Consumer, error) {
	topic := fmt.Sprintf("raw-logs.%s", tenantID)
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		GroupID:  fmt.Sprintf("tms-consumer-%s", tenantID),
		Topic:    topic,
		MinBytes: 1,
		MaxBytes: 10 << 20, // 10MB
	})

	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{clickhouseAddr},
		Auth: clickhouse.Auth{
			Database: fmt.Sprintf("db_tenant_%s", tenantID),
			Username: chUser,
			Password: chPassword,
		},
		Compression: &clickhouse.Compression{Method: clickhouse.CompressionLZ4},
	})
	if err != nil {
		return nil, fmt.Errorf("clickhouse connect error: %w", err)
	}

	return &Consumer{
		reader:   reader,
		chConn:   conn,
		tenantID: tenantID,
	}, nil
}

// Run starts the consume loop with batch processing
func (c *Consumer) Run(ctx context.Context) {
	batch := make([]map[string]interface{}, 0, batchSize)
	ticker := time.NewTicker(batchTimeout)
	defer ticker.Stop()

	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := c.insertBatch(ctx, batch); err != nil {
			log.Printf("[consumer][%s] batch insert error: %v", c.tenantID, err)
		}
		batch = batch[:0]
	}

	for {
		select {
		case <-ctx.Done():
			flush()
			return
		case <-ticker.C:
			flush()
		default:
			msg, err := c.reader.FetchMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Printf("[consumer][%s] fetch error: %v", c.tenantID, err)
				continue
			}

			var payload map[string]interface{}
			if err := json.Unmarshal(msg.Value, &payload); err != nil {
				log.Printf("[consumer][%s] unmarshal error: %v", c.tenantID, err)
				_ = c.reader.CommitMessages(ctx, msg)
				continue
			}

			batch = append(batch, payload)
			_ = c.reader.CommitMessages(ctx, msg)

			if len(batch) >= batchSize {
				flush()
			}
		}
	}
}

// insertBatch performs a single batch INSERT into ClickHouse
// tenant DB is explicit: db_tenant_{id}.raw_logs — no shared DB queries
func (c *Consumer) insertBatch(ctx context.Context, batch []map[string]interface{}) error {
	dbName := fmt.Sprintf("db_tenant_%s", c.tenantID)
	b, err := c.chConn.PrepareBatch(ctx, fmt.Sprintf("INSERT INTO `%s`.`raw_logs`", dbName))
	if err != nil {
		return fmt.Errorf("prepare batch error: %w", err)
	}

	for _, row := range batch {
		rawJSON, _ := json.Marshal(row)
		if err := b.Append(
			time.Now(),
			c.tenantID,
			string(rawJSON),
		); err != nil {
			return fmt.Errorf("batch append error: %w", err)
		}
	}

	return b.Send()
}

func (c *Consumer) Close() {
	_ = c.reader.Close()
	_ = c.chConn.Close()
}
