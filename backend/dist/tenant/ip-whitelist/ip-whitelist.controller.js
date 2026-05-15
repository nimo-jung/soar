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
    constructor(ipWhitelistService) {
        this.ipWhitelistService = ipWhitelistService;
    }
    findAll() {
        return this.ipWhitelistService.findAll();
    }
    create(dto) {
        return this.ipWhitelistService.create(dto.ipAddress, dto.description);
    }
    remove(id) {
        return this.ipWhitelistService.remove(id);
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateIpWhitelistDto]),
    __metadata("design:returntype", void 0)
], IpWhitelistController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_guard_1.TenantRole.OPERATOR),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'IP 화이트리스트 항목 비활성화' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], IpWhitelistController.prototype, "remove", null);
exports.IpWhitelistController = IpWhitelistController = __decorate([
    (0, swagger_1.ApiTags)('Tenant - IP Whitelist'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api/ip-whitelist'),
    __metadata("design:paramtypes", [ip_whitelist_service_1.IpWhitelistService])
], IpWhitelistController);
//# sourceMappingURL=ip-whitelist.controller.js.map