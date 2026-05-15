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
exports.PlaybooksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const playbooks_service_1 = require("./playbooks.service");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
class CreatePlaybookDto {
    name;
    description;
    definition;
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePlaybookDto.prototype, "name", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePlaybookDto.prototype, "description", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: '워크플로우 정의 JSON' }),
    __metadata("design:type", Object)
], CreatePlaybookDto.prototype, "definition", void 0);
let PlaybooksController = class PlaybooksController {
    playbooksService;
    constructor(playbooksService) {
        this.playbooksService = playbooksService;
    }
    findAll() {
        return this.playbooksService.findAll();
    }
    create(dto, user) {
        return this.playbooksService.create(dto.name, dto.definition, user.sub, dto.description);
    }
    execute(id) {
        return this.playbooksService.execute(id);
    }
};
exports.PlaybooksController = PlaybooksController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.TenantRole.OPERATOR, roles_guard_1.TenantRole.ANALYST, roles_guard_1.TenantRole.AUDITOR),
    (0, swagger_1.ApiOperation)({ summary: '플레이북 목록 조회' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PlaybooksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_guard_1.TenantRole.OPERATOR),
    (0, swagger_1.ApiOperation)({ summary: '플레이북 생성' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePlaybookDto, Object]),
    __metadata("design:returntype", void 0)
], PlaybooksController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/execute'),
    (0, roles_decorator_1.Roles)(roles_guard_1.TenantRole.OPERATOR, roles_guard_1.TenantRole.ANALYST),
    (0, swagger_1.ApiOperation)({ summary: '플레이북 즉시 실행 (정의 동적 로드)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PlaybooksController.prototype, "execute", null);
exports.PlaybooksController = PlaybooksController = __decorate([
    (0, swagger_1.ApiTags)('Tenant - Playbooks'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api/playbooks'),
    __metadata("design:paramtypes", [playbooks_service_1.PlaybooksService])
], PlaybooksController);
//# sourceMappingURL=playbooks.controller.js.map