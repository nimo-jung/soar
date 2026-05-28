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
exports.UpdateTenantDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const tenant_entity_1 = require("../entities/tenant.entity");
const IP_OR_CIDR_LIST_REGEX = /^\s*(?:\d{1,3}(?:\.\d{1,3}){3}(?:\/(?:3[0-2]|[12]?\d))?)(?:\s*,\s*\d{1,3}(?:\.\d{1,3}){3}(?:\/(?:3[0-2]|[12]?\d))?)*\s*$/;
class UpdateTenantDto {
    name;
    status;
    contactEmail;
    tierId;
    epsLimit;
    storageQuotaGb;
    retentionDays;
    expiresAt;
    ipCidr;
}
exports.UpdateTenantDto = UpdateTenantDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '고객사명' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateTenantDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: tenant_entity_1.TenantStatus, description: '테넌트 상태' }),
    (0, class_validator_1.IsEnum)(tenant_entity_1.TenantStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateTenantDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '담당자 이메일' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateTenantDto.prototype, "contactEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '테넌트 등급 ID' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateTenantDto.prototype, "tierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '초당 허용 이벤트 수(EPS) 한도' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateTenantDto.prototype, "epsLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '스토리지 허용 한도(GB)' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateTenantDto.prototype, "storageQuotaGb", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '로그 보관 주기(일)' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateTenantDto.prototype, "retentionDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '사용 기한(ISO-8601). 무제한 등급 또는 system 테넌트는 null 허용' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateTenantDto.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: '로그 수집 대상 IP 대역(단일 IP 또는 CIDR, 콤마 구분 목록)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(IP_OR_CIDR_LIST_REGEX, {
        message: 'ipCidr는 단일 IP 또는 CIDR 형식이며, 다중 입력은 콤마(,)로 구분해야 합니다.',
    }),
    __metadata("design:type", String)
], UpdateTenantDto.prototype, "ipCidr", void 0);
//# sourceMappingURL=update-tenant.dto.js.map