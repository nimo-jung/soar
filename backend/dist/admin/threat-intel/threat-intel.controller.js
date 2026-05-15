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
let ThreatIntelController = class ThreatIntelController {
    threatIntelService;
    constructor(threatIntelService) {
        this.threatIntelService = threatIntelService;
    }
    create(dto) {
        return this.threatIntelService.create(dto);
    }
    findAll() {
        return this.threatIntelService.findAll();
    }
    deactivate(id) {
        return this.threatIntelService.deactivate(id);
    }
};
exports.ThreatIntelController = ThreatIntelController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: '글로벌 TI 피드 등록 및 RedPanda 전파' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_threat_intel_dto_1.CreateThreatIntelDto]),
    __metadata("design:returntype", void 0)
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ThreatIntelController.prototype, "deactivate", null);
exports.ThreatIntelController = ThreatIntelController = __decorate([
    (0, swagger_1.ApiTags)('Admin - Threat Intel'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(master_guard_1.MasterGuard),
    (0, common_1.Controller)('admin/threat-intel'),
    __metadata("design:paramtypes", [threat_intel_service_1.ThreatIntelService])
], ThreatIntelController);
//# sourceMappingURL=threat-intel.controller.js.map