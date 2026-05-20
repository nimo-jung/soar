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
exports.ThreatIntelController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const threat_intel_service_1 = require("./threat-intel.service");
const create_threat_intel_dto_1 = require("./dto/create-threat-intel.dto");
const master_guard_1 = require("../../common/guards/master.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const audit_log_service_1 = require("../../common/audit/audit-log.service");
const audit_log_entity_1 = require("../../common/audit/entities/audit-log.entity");
let ThreatIntelController = class ThreatIntelController {
    threatIntelService;
    auditLogService;
    constructor(threatIntelService, auditLogService) {
        this.threatIntelService = threatIntelService;
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
    async create(dto, user, req) {
        const created = await this.threatIntelService.create(dto);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'THREAT_INTEL_CREATE',
            resourceType: 'THREAT_INTEL',
            resourceId: String(created.id),
            message: '글로벌 TI 피드 등록',
            metadata: {
                feedType: created.feedType,
                indicator: created.indicator,
                severity: created.severity,
                source: created.source,
            },
        });
        return created;
    }
    findAll() {
        return this.threatIntelService.findAll();
    }
    async deactivate(id, user, req) {
        await this.threatIntelService.deactivate(id);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'THREAT_INTEL_DEACTIVATE',
            resourceType: 'THREAT_INTEL',
            resourceId: String(id),
            message: '글로벌 TI 피드 비활성화',
        });
    }
    async dispatch(id, user, req) {
        const result = await this.threatIntelService.dispatchFeed(id);
        await this.auditLogService.record({
            ...this.buildAuditContext(user, req),
            action: 'THREAT_INTEL_DISPATCH',
            resourceType: 'THREAT_INTEL',
            resourceId: String(id),
            message: `TI 피드 전파 재시도 | status=${result.dispatchStatus}`,
            metadata: { dispatchStatus: result.dispatchStatus, dispatchAttempts: result.dispatchAttempts },
        });
        return result;
    }
};
exports.ThreatIntelController = ThreatIntelController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: '글로벌 TI 피드 등록 및 RedPanda 전파' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_threat_intel_dto_1.CreateThreatIntelDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ThreatIntelController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: '활성 TI 피드 목록 조회' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ThreatIntelController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'TI 피드 비활성화' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], ThreatIntelController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)(':id/dispatch'),
    (0, swagger_1.ApiOperation)({ summary: 'TI 피드 RedPanda 전파 재시도' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], ThreatIntelController.prototype, "dispatch", null);
exports.ThreatIntelController = ThreatIntelController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Threat Intel'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(master_guard_1.MasterGuard),
    (0, common_1.Controller)('admin/threat-intel'),
    __metadata("design:paramtypes", [threat_intel_service_1.ThreatIntelService,
        audit_log_service_1.AuditLogService])
], ThreatIntelController);
//# sourceMappingURL=threat-intel.controller.js.map