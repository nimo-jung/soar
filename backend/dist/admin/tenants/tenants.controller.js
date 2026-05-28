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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tenants_service_1 = require("./tenants.service");
const create_tenant_dto_1 = require("./dto/create-tenant.dto");
const update_tenant_dto_1 = require("./dto/update-tenant.dto");
const create_tenant_tier_dto_1 = require("./dto/create-tenant-tier.dto");
const update_tenant_tier_dto_1 = require("./dto/update-tenant-tier.dto");
const issue_tenant_bootstrap_token_dto_1 = require("./dto/issue-tenant-bootstrap-token.dto");
const issue_tenant_password_reset_token_dto_1 = require("./dto/issue-tenant-password-reset-token.dto");
const get_tenant_bootstrap_tokens_query_dto_1 = require("./dto/get-tenant-bootstrap-tokens-query.dto");
const master_guard_1 = require("../../common/guards/master.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const audit_log_service_1 = require("../../common/audit/audit-log.service");
const audit_log_entity_1 = require("../../common/audit/entities/audit-log.entity");
let TenantsController = class TenantsController {
    tenantsService;
    auditLogService;
    constructor(tenantsService, auditLogService) {
        this.tenantsService = tenantsService;
        this.auditLogService = auditLogService;
    }
    buildAuditContext(user, req) {
        return {
            actorType: user.isMaster ? audit_log_entity_1.AuditActorType.MASTER : audit_log_entity_1.AuditActorType.TENANT,
            actorId: user.sub,
            actorEmail: user.email ?? null,
            tenantSlug: user.tenantId ?? null,
            ipAddress: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
    safe(value) {
        if (value === null || value === undefined)
            return '-';
        if (typeof value === 'string' && value.trim().length === 0)
            return '-';
        return String(value);
    }
    async create(dto, user, req) {
        const created = await this.tenantsService.create(dto);
        const settings = await this.tenantsService.getSettings(created.id);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'TENANT_CREATE',
            resourceType: 'TENANT',
            resourceId: String(created.id),
            message: [
                `테넌트 생성`,
                `name=${this.safe(created.name)}`,
                `slug=${this.safe(created.slug)}`,
                `tierId=${this.safe(created.tierId)}`,
                `epsLimit=${this.safe(settings.epsLimit)}`,
                `storageQuotaGb=${this.safe(settings.storageQuotaGb)}`,
                `retentionDays=${this.safe(settings.retentionDays)}`,
                `status=${this.safe(created.status)}`,
                `expiresAt=${this.safe(created.expiresAt)}`,
                `ipCidr=${this.safe(created.ipCidr)}`,
            ].join(' | '),
            metadata: {
                name: created.name,
                slug: created.slug,
                tierId: created.tierId,
                epsLimit: settings.epsLimit,
                storageQuotaGb: settings.storageQuotaGb,
                retentionDays: settings.retentionDays,
                status: created.status,
                expiresAt: created.expiresAt,
                ipCidr: created.ipCidr,
            },
        });
        return created;
    }
    findAll() {
        return this.tenantsService.findAll();
    }
    getTiers() {
        return this.tenantsService.getTiers();
    }
    async createTier(dto, user, req) {
        const created = await this.tenantsService.createTier(dto);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'TENANT_TIER_CREATE',
            resourceType: 'TENANT_TIER',
            resourceId: String(created.id),
            message: [
                '테넌트 등급 생성',
                `code=${this.safe(created.code)}`,
                `name=${this.safe(created.name)}`,
                `dailyLogQuotaGb=${this.safe(created.dailyLogQuotaGb)}`,
                `maxUsers=${this.safe(created.maxUsers)}`,
                `isActive=${this.safe(created.isActive)}`,
            ].join(' | '),
            metadata: {
                code: created.code,
                name: created.name,
                dailyLogQuotaGb: created.dailyLogQuotaGb,
                maxUsers: created.maxUsers,
                isActive: created.isActive,
            },
        });
        return created;
    }
    async updateTier(id, dto, user, req) {
        const before = await this.tenantsService.getTiers().then((tiers) => tiers.find((tier) => tier.id === id) ?? null);
        const updated = await this.tenantsService.updateTier(id, dto);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'TENANT_TIER_UPDATE',
            resourceType: 'TENANT_TIER',
            resourceId: String(updated.id),
            message: [
                '테넌트 등급 수정',
                `code=${this.safe(updated.code)}`,
                `name=${this.safe(before?.name)} -> ${this.safe(updated.name)}`,
                `dailyLogQuotaGb=${this.safe(before?.dailyLogQuotaGb)} -> ${this.safe(updated.dailyLogQuotaGb)}`,
                `maxUsers=${this.safe(before?.maxUsers)} -> ${this.safe(updated.maxUsers)}`,
                `isActive=${this.safe(before?.isActive)} -> ${this.safe(updated.isActive)}`,
            ].join(' | '),
            metadata: {
                changedFields: Object.keys(dto),
                before,
                after: updated,
            },
        });
        return updated;
    }
    checkTierDeletion(id) {
        return this.tenantsService.getTierDeletionStatus(id);
    }
    async removeTier(id, user, req) {
        const deletedTier = await this.tenantsService.deleteTier(id);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'TENANT_TIER_DELETE',
            resourceType: 'TENANT_TIER',
            resourceId: String(deletedTier.id),
            message: [
                '테넌트 등급 삭제',
                `code=${this.safe(deletedTier.code)}`,
                `name=${this.safe(deletedTier.name)}`,
            ].join(' | '),
            metadata: {
                code: deletedTier.code,
                name: deletedTier.name,
            },
        });
    }
    findOne(id) {
        return this.tenantsService.findOne(id);
    }
    async update(id, dto, user, req) {
        const before = await this.tenantsService.findOne(id);
        const beforeSettings = await this.tenantsService.getSettings(id).catch(() => null);
        const updated = await this.tenantsService.update(id, dto);
        const updatedSettings = await this.tenantsService.getSettings(id).catch(() => null);
        const isDeleteAction = dto.status === 'DELETED';
        const isStatusChange = dto.status !== undefined && dto.status !== before.status;
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: isDeleteAction ? 'TENANT_DELETE' : isStatusChange ? 'TENANT_STATUS_CHANGE' : 'TENANT_UPDATE',
            resourceType: 'TENANT',
            resourceId: String(updated.id),
            message: [
                isDeleteAction ? '테넌트 삭제(상태 전환)' : isStatusChange ? '테넌트 상태 변경' : '테넌트 수정',
                `name=${this.safe(updated.name)}`,
                `slug=${this.safe(updated.slug)}`,
                `status=${this.safe(before.status)} -> ${this.safe(updated.status)}`,
                `tierId=${this.safe(before.tierId)} -> ${this.safe(updated.tierId)}`,
                `epsLimit=${this.safe(beforeSettings?.epsLimit)} -> ${this.safe(updatedSettings?.epsLimit)}`,
                `storageQuotaGb=${this.safe(beforeSettings?.storageQuotaGb)} -> ${this.safe(updatedSettings?.storageQuotaGb)}`,
                `retentionDays=${this.safe(beforeSettings?.retentionDays)} -> ${this.safe(updatedSettings?.retentionDays)}`,
                `expiresAt=${this.safe(before.expiresAt)} -> ${this.safe(updated.expiresAt)}`,
                `ipCidr=${this.safe(before.ipCidr)} -> ${this.safe(updated.ipCidr)}`,
            ].join(' | '),
            metadata: {
                changedFields: Object.keys(dto),
                before,
                after: updated,
                beforeSettings,
                afterSettings: updatedSettings,
            },
        });
        return updated;
    }
    async remove(id, user, req) {
        const before = await this.tenantsService.findOne(id);
        await this.tenantsService.softDelete(id);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'TENANT_DELETE',
            resourceType: 'TENANT',
            resourceId: String(id),
            message: [
                '테넌트 삭제(소프트)',
                `id=${id}`,
                `name=${this.safe(before.name)}`,
                `slug=${this.safe(before.slug)}`,
                `status=${this.safe(before.status)} -> DELETED`,
            ].join(' | '),
            metadata: {
                before,
            },
        });
    }
    getSettings(id) {
        return this.tenantsService.getSettings(id);
    }
    async issueBootstrapToken(id, dto, user, req) {
        const issued = await this.tenantsService.issueBootstrapToken(id, dto, user.sub);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'TENANT_BOOTSTRAP_TOKEN_ISSUE',
            resourceType: 'TENANT_BOOTSTRAP_TOKEN',
            resourceId: String(id),
            message: [
                '테넌트 최초 관리자 등록 토큰 발급',
                `tenantId=${issued.tenantId}`,
                `tenantSlug=${this.safe(issued.tenantSlug)}`,
                `email=${this.safe(issued.email)}`,
                `deliveredToEmail=${issued.deliveredToEmail ? 'Y' : 'N'}`,
                `mailDeliveryError=${this.safe(issued.mailDeliveryError)}`,
                `expiresAt=${this.safe(issued.expiresAt)}`,
            ].join(' | '),
            metadata: {
                tenantId: issued.tenantId,
                tenantSlug: issued.tenantSlug,
                email: issued.email,
                deliveredToEmail: issued.deliveredToEmail,
                mailDeliveryError: issued.mailDeliveryError,
                expiresAt: issued.expiresAt,
            },
        });
        return issued;
    }
    getBootstrapTokenHistory(id, query) {
        return this.tenantsService.getBootstrapTokenHistory(id, query);
    }
    async issuePasswordResetToken(id, dto, user, req) {
        const issued = await this.tenantsService.issuePasswordResetToken(id, dto, user.sub);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'TENANT_PASSWORD_RESET_TOKEN_ISSUE',
            resourceType: 'TENANT_PASSWORD_RESET_TOKEN',
            resourceId: String(id),
            message: [
                '테넌트 관리자 비밀번호 재설정 토큰 발급',
                `tenantId=${issued.tenantId}`,
                `tenantSlug=${this.safe(issued.tenantSlug)}`,
                `email=${this.safe(issued.email)}`,
                `deliveredToEmail=${issued.deliveredToEmail ? 'Y' : 'N'}`,
                `mailDeliveryError=${this.safe(issued.mailDeliveryError)}`,
                `expiresAt=${this.safe(issued.expiresAt)}`,
            ].join(' | '),
            metadata: {
                tenantId: issued.tenantId,
                tenantSlug: issued.tenantSlug,
                email: issued.email,
                deliveredToEmail: issued.deliveredToEmail,
                mailDeliveryError: issued.mailDeliveryError,
                expiresAt: issued.expiresAt,
            },
        });
        return issued;
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 생성 및 전용 DB 프로비저닝' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tenant_dto_1.CreateTenantDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: '전체 테넌트 목록 조회' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('tiers'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 등급(티어) 목록 조회' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "getTiers", null);
__decorate([
    (0, common_1.Post)('tiers'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 등급(티어) 생성' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tenant_tier_dto_1.CreateTenantTierDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "createTier", null);
__decorate([
    (0, common_1.Patch)('tiers/:id'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 등급(티어) 수정' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_tenant_tier_dto_1.UpdateTenantTierDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateTier", null);
__decorate([
    (0, common_1.Get)('tiers/:id/deletion-check'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 등급(티어) 삭제 가능 여부 확인' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "checkTierDeletion", null);
__decorate([
    (0, common_1.Delete)('tiers/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 등급(티어) 삭제' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "removeTier", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 상세 조회' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 정보 수정 (상태 변경 포함)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_tenant_dto_1.UpdateTenantDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 소프트 삭제 (상태 → DELETED)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/settings'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 설정 조회 (EPS·스토리지·보관 주기)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)(':id/bootstrap-token'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 최초 관리자 등록용 토큰 발급' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, issue_tenant_bootstrap_token_dto_1.IssueTenantBootstrapTokenDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "issueBootstrapToken", null);
__decorate([
    (0, common_1.Get)(':id/bootstrap-tokens'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 최초 관리자 등록 토큰 발급 이력 조회' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, get_tenant_bootstrap_tokens_query_dto_1.GetTenantBootstrapTokensQueryDto]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "getBootstrapTokenHistory", null);
__decorate([
    (0, common_1.Post)(':id/password-reset-token'),
    (0, swagger_1.ApiOperation)({ summary: '테넌트 관리자 비밀번호 재설정 토큰 발급' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, issue_tenant_password_reset_token_dto_1.IssueTenantPasswordResetTokenDto, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "issuePasswordResetToken", null);
exports.TenantsController = TenantsController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Tenants'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(master_guard_1.MasterGuard),
    (0, common_1.Controller)('admin/tenants'),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService,
        audit_log_service_1.AuditLogService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map