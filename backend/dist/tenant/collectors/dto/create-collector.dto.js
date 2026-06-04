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
exports.CreateCollectorDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateCollectorDto {
    name;
    description;
    deviceCode;
    sourceIp;
}
exports.CreateCollectorDto = CreateCollectorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Collector 이름', example: 'Firewall-01' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCollectorDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '설명' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCollectorDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '장비 고유 코드(전역 유일, 미입력 시 name 사용)', example: 'PA-DC1-EDGE-001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^[A-Za-z0-9._:-]{3,128}$/),
    __metadata("design:type", String)
], CreateCollectorDto.prototype, "deviceCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '장비 고정 Source IP (선택)', example: '10.10.10.15' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIP)(4),
    __metadata("design:type", String)
], CreateCollectorDto.prototype, "sourceIp", void 0);
//# sourceMappingURL=create-collector.dto.js.map