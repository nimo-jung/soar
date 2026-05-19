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
exports.Tenant = exports.TenantStatus = void 0;
const typeorm_1 = require("typeorm");
const tenant_tier_entity_1 = require("./tenant-tier.entity");
var TenantStatus;
(function (TenantStatus) {
    TenantStatus["ACTIVE"] = "ACTIVE";
    TenantStatus["SUSPENDED"] = "SUSPENDED";
    TenantStatus["DELETED"] = "DELETED";
})(TenantStatus || (exports.TenantStatus = TenantStatus = {}));
let Tenant = class Tenant {
    id;
    slug;
    name;
    status;
    contactEmail;
    expiresAt;
    ipCidr;
    tier;
    tierCode;
    createdAt;
    updatedAt;
};
exports.Tenant = Tenant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '테넌트 고유 ID' }),
    __metadata("design:type", Number)
], Tenant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, comment: '테넌트 슬러그 (DB명 접미사로 사용)' }),
    __metadata("design:type", String)
], Tenant.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '고객사명' }),
    __metadata("design:type", String)
], Tenant.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TenantStatus,
        default: TenantStatus.ACTIVE,
        comment: '테넌트 상태: ACTIVE | SUSPENDED | DELETED',
    }),
    __metadata("design:type", String)
], Tenant.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, comment: '담당자 이메일' }),
    __metadata("design:type", String)
], Tenant.prototype, "contactEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true, comment: '사용 기한(만료 일시)' }),
    __metadata("design:type", Object)
], Tenant.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '허용 IP 대역(CIDR 또는 콤마 구분 목록)' }),
    __metadata("design:type", Object)
], Tenant.prototype, "ipCidr", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_tier_entity_1.TenantTier),
    (0, typeorm_1.JoinColumn)({ name: 'tierCode', referencedColumnName: 'code' }),
    __metadata("design:type", tenant_tier_entity_1.TenantTier)
], Tenant.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: tenant_tier_entity_1.TenantTierCode,
        default: tenant_tier_entity_1.TenantTierCode.LITE,
        comment: '테넌트 등급 코드',
    }),
    __metadata("design:type", String)
], Tenant.prototype, "tierCode", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '생성 일시' }),
    __metadata("design:type", Date)
], Tenant.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정 일시' }),
    __metadata("design:type", Date)
], Tenant.prototype, "updatedAt", void 0);
exports.Tenant = Tenant = __decorate([
    (0, typeorm_1.Entity)('tenants', { comment: '멀티테넌트 고객사 목록' })
], Tenant);
//# sourceMappingURL=tenant.entity.js.map