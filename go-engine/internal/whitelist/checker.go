package whitelist

import (
	"context"
	"fmt"
	"net"

	"github.com/redis/go-redis/v9"
)

// Checker validates source IPs against Redis-cached whitelist
// Redis key pattern: tenant:{id}:whitelist  (Set of CIDR/IP strings)
type Checker struct {
	rdb *redis.Client
}

func New(rdb *redis.Client) *Checker {
	return &Checker{rdb: rdb}
}

// IsAllowed returns true if sourceIP is in the tenant's whitelist
// or if the whitelist is empty (no restriction)
func (c *Checker) IsAllowed(ctx context.Context, tenantID, sourceIP string) (bool, error) {
	key := fmt.Sprintf("tenant:%s:whitelist", tenantID)

	members, err := c.rdb.SMembers(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("whitelist redis error: %w", err)
	}

	// Empty whitelist = no restriction
	if len(members) == 0 {
		return true, nil
	}

	ip := net.ParseIP(sourceIP)
	if ip == nil {
		return false, fmt.Errorf("invalid source IP: %s", sourceIP)
	}

	for _, member := range members {
		if member == sourceIP {
			return true, nil
		}
		_, cidr, err := net.ParseCIDR(member)
		if err == nil && cidr.Contains(ip) {
			return true, nil
		}
	}

	return false, nil
}
