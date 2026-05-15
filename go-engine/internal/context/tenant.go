package context

import "context"

type contextKey string

const tenantIDKey contextKey = "tenant_id"

// WithTenantID injects tenant_id into a context
func WithTenantID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantIDKey, tenantID)
}

// TenantIDFrom extracts tenant_id from context
func TenantIDFrom(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(tenantIDKey).(string)
	return v, ok && v != ""
}
