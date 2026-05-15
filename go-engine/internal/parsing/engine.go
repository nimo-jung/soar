package parsing

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// Rule represents a tenant-specific parsing rule
type Rule struct {
	ID         int                    `json:"id"`
	Name       string                 `json:"name"`
	Definition map[string]interface{} `json:"ruleDefinition"`
	Priority   int                    `json:"priority"`
	IsActive   bool                   `json:"isActive"`
}

// Engine applies parsing rules loaded from Redis
// Redis key pattern: tenant:{id}:parsing_rules (JSON array)
type Engine struct {
	rdb *redis.Client
}

func New(rdb *redis.Client) *Engine {
	return &Engine{rdb: rdb}
}

// GetRules returns cached parsing rules for a tenant
func (e *Engine) GetRules(ctx context.Context, tenantID string) ([]Rule, error) {
	key := fmt.Sprintf("tenant:%s:parsing_rules", tenantID)

	data, err := e.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("parsing rules redis error: %w", err)
	}

	var rules []Rule
	if err := json.Unmarshal(data, &rules); err != nil {
		return nil, fmt.Errorf("parsing rules unmarshal error: %w", err)
	}
	return rules, nil
}

// Apply transforms raw log bytes using the tenant's active rules.
// Returns enriched log map.
func (e *Engine) Apply(ctx context.Context, tenantID string, raw []byte) (map[string]interface{}, error) {
	var logData map[string]interface{}
	if err := json.Unmarshal(raw, &logData); err != nil {
		// Non-JSON raw log: wrap as message
		logData = map[string]interface{}{"raw_message": string(raw)}
	}

	rules, err := e.GetRules(ctx, tenantID)
	if err != nil {
		return logData, err
	}

	for _, rule := range rules {
		if !rule.IsActive {
			continue
		}
		// Apply each rule's field mapping defined in ruleDefinition
		if fieldMappings, ok := rule.Definition["fieldMappings"]; ok {
			if mappings, ok := fieldMappings.(map[string]interface{}); ok {
				for src, dst := range mappings {
					if val, exists := logData[src]; exists {
						logData[dst.(string)] = val
					}
				}
			}
		}
	}

	logData["tenant_id"] = tenantID
	return logData, nil
}
