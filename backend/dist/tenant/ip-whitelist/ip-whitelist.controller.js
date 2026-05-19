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
exports.IpWhitelistController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ip_whitelist_service_1 = require("./ip-whitelist.service");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const audit_log_service_1 = require("../../common/audit/audit-log.service");
const audit_log_entity_1 = require("../../common/audit/entities/audit-log.entity");
class CreateIpWhitelistDto {
    ipAddress;
    description;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: '192.168.1.0/24' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateIpWhitelistDto.prototype, "ipAddress", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateIpWhitelistDto.prototype, "description", void 0);
let IpWhitelistController = class IpWhitelistController {
    ipWhitelistService;
    auditLogService;
    constructor(ipWhitelistService, auditLogService) {
        this.ipWhitelistService = ipWhitelistService;
        this.auditLogService = auditLogService;
    }
    buildAuditContext(user, req) {
        return {
            actorType: audit_log_entity_1.AuditActorType.TENANT,
            actorId: user.sub,
            tenantSlug: user.tenantId ?? null,
            ipAddress: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        };
    }
    findAll() {
        return this.ipWhitelistService.findAll();
    }
    async create(dto, user, req) {
        const created = await this.ipWhitelistService.create(dto.ipAddress, dto.description);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'IP_WHITELIST_CREATE',
            resourceType: 'IP_WHITELIST',
            resourceId: String(created.id),
            message: 'IP 화이트리스트 항목 추가',
            metadata: {
                ipAddress: created.ipAddress,
                description: created.description,
            },
        });
        return created;
    }
    async remove(id, user, req) {
        await this.ipWhitelistService.remove(id);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'IP_WHITELIST_DELETE',
            resourceType: 'IP_WHITELIST',
            resourceId: String(id),
            message: 'IP 화이트리스트 항목 비활성화',
        });
    }
};
exports.IpWhitelistController = IpWhitelistController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.TenantRole.OPERATOR, roles_guard_1.TenantRole.ANALYST, roles_guard_1.TenantRole.AUDITOR),
    (0, swagger_1.ApiOperation)({ summary: 'IP 화이트리스트 조회' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IpWhitelistController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.TenantRole.OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'IP 화이트리스트 항목 추가' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateIpWhitelistDto, Object, Object]),
    __metadata("design:returntype", Promise)
], IpWhitelistController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.TenantRole.OPERATOR),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'IP 화이트리스트 항목 비활성화' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], IpWhitelistController.prototype, "remove", null);
exports.IpWhitelistController = IpWhitelistController = __decorate([
    (0, swagger_1.ApiTags)('Tenant - IP Whitelist'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api/ip-whitelist'),
    __metadata("design:paramtypes", [ip_whitelist_service_1.IpWhitelistService,
        audit_log_service_1.AuditLogService])
], IpWhitelistController);
//# sourceMappingURL=ip-whitelist.controller.js.map