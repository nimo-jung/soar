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
exports.TenantLoginDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class TenantLoginDto {
    email;
    password;
    tenantSlug;
    forceLogoutExistingSessions;
}
exports.TenantLoginDto = TenantLoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'operator@acme.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], TenantLoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'securepassword' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TenantLoginDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '테넌트 슬러그 (단일 테넌트 모드에서는 생략 가능)', example: 'acme-corp', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TenantLoginDto.prototype, "tenantSlug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '동시 세션 초과 시 기존 세션을 강제 종료하고 로그인할지 여부' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TenantLoginDto.prototype, "forceLogoutExistingSessions", void 0);
//# sourceMappingURL=tenant-login.dto.js.map