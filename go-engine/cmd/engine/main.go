package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tms/go-engine/internal/ingestion"
	"github.com/tms/go-engine/internal/publisher"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Redis connection
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", getEnv("REDIS_HOST", "localhost"), getEnv("REDIS_PORT", "6379")),
		Password: getEnv("REDIS_PASSWORD", ""),
		DB:       0,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("[main] redis connect failed: %v", err)
	}
	defer rdb.Close()

	// RedPanda publisher
	brokers := []string{fmt.Sprintf("%s:%s", getEnv("REDPANDA_HOST", "localhost"), getEnv("REDPANDA_PORT", "9092"))}
	pub := publisher.New(brokers)
	defer pub.Close()

	// HTTP server
	mux := http.NewServeMux()
	handler := ingestion.NewHandler(rdb, pub)
	mux.HandleFunc("/ingest", handler.IngestHandler)
	mux.HandleFunc("/health", ingestion.HealthHandler)
	mux.HandleFunc("/metrics", handler.MetricsHandler)

	port := getEnv("PORT", "8081")
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[main] Go Engine 기동: :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[main] server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("[main] 종료 신호 수신, graceful shutdown...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[main] shutdown error: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
