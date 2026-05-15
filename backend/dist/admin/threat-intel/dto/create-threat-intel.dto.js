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
exports.CreateThreatIntelDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateThreatIntelDto {
    feedType;
    indicator;
    severity;
    description;
    source;
}
exports.CreateThreatIntelDto = CreateThreatIntelDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '피드 유형', example: 'IP' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['IP', 'DOMAIN', 'HASH', 'URL']),
    __metadata("design:type", String)
], CreateThreatIntelDto.prototype, "feedType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '위협 지표', example: '192.168.1.100' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateThreatIntelDto.prototype, "indicator", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '위협 수준', example: 'HIGH' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateThreatIntelDto.prototype, "severity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '위협 설명' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateThreatIntelDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '출처' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateThreatIntelDto.prototype, "source", void 0);
//# sourceMappingURL=create-threat-intel.dto.js.map