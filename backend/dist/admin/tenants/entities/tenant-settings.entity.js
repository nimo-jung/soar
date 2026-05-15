"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantSettings = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("./tenant.entity");
let TenantSettings = class TenantSettings {
    id;
    tenant;
    tenantId;
    epsLimit;
    storageQuotaGb;
    retentionDays;
    brandingConfig;
    createdAt;
    updatedAt;
};
exports.TenantSettings = TenantSettings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '설정 고유 ID' }),
    __metadata("design:type", Number)
], TenantSettings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => tenant_entity_1.Tenant),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], TenantSettings.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', comment: '대상 테넌트 ID' }),
    __metadata("design:type", Number)
], TenantSettings.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'eps_limit',
        type: 'int',
        default: 1000,
        comment: '초당 허용 이벤트 수(Events Per Second) 한도',
    }),
    __metadata("design:type", Number)
], TenantSettings.prototype, "epsLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'storage_quota_gb',
        type: 'int',
        default: 100,
        comment: '스토리지 허용 한도 (GB)',
    }),
    __metadata("design:type", Number)
], TenantSettings.prototype, "storageQuotaGb", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'retention_days',
        type: 'int',
        default: 90,
        comment: 'ClickHouse TTL 기준 로그 보관 주기 (일)',
    }),
    __metadata("design:type", Number)
], TenantSettings.prototype, "retentionDays", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'branding_config',
        type: 'json',
        nullable: true,
        comment: '화이트라벨링 설정 (primary_color, logo_url, favicon_url 등)',
    }),
    __metadata("design:type", Object)
], TenantSettings.prototype, "brandingConfig", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '생성 일시' }),
    __metadata("design:type", Date)
], TenantSettings.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정 일시' }),
    __metadata("design:type", Date)
], TenantSettings.prototype, "updatedAt", void 0);
exports.TenantSettings = TenantSettings = __decorate([
    (0, typeorm_1.Entity)('tenant_settings', { comment: '테넌트별 제한·정책 설정' })
], TenantSettings);
//# sourceMappingURL=tenant-settings.entity.js.map