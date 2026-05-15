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
exports.CollectorsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const collectors_service_1 = require("./collectors.service");
const create_collector_dto_1 = require("./dto/create-collector.dto");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_2 = require("../../common/guards/roles.guard");
let CollectorsController = class CollectorsController {
    collectorsService;
    constructor(collectorsService) {
        this.collectorsService = collectorsService;
    }
    create(dto) {
        return this.collectorsService.create(dto);
    }
    findAll() {
        return this.collectorsService.findAll();
    }
    deactivate(id) {
        return this.collectorsService.deactivate(id);
    }
};
exports.CollectorsController = CollectorsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_2.TenantRole.OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: 'Collector 등록 및 API Key 발급 (plain key 단 1회 반환)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_collector_dto_1.CreateCollectorDto]),
    __metadata("design:returntype", void 0)
], CollectorsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_guard_2.TenantRole.OPERATOR, roles_guard_2.TenantRole.ANALYST),
    (0, swagger_1.ApiOperation)({ summary: 'Collector 목록 조회' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CollectorsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, roles_decorator_1.Roles)(roles_guard_2.TenantRole.OPERATOR),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Collector 비활성화' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CollectorsController.prototype, "deactivate", null);
exports.CollectorsController = CollectorsController = __decorate([
    (0, swagger_1.ApiTags)('Tenant - Collectors'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api/collectors'),
    __metadata("design:paramtypes", [collectors_service_1.CollectorsService])
], CollectorsController);
//# sourceMappingURL=collectors.controller.js.map