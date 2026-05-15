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
exports.IpWhitelist = void 0;
const typeorm_1 = require("typeorm");
let IpWhitelist = class IpWhitelist {
    id;
    ipAddress;
    description;
    isActive;
    createdAt;
    updatedAt;
};
exports.IpWhitelist = IpWhitelist;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '규칙 고유 ID' }),
    __metadata("design:type", Number)
], IpWhitelist.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', comment: 'CIDR 또는 단일 IP (예: 192.168.1.0/24)' }),
    __metadata("design:type", String)
], IpWhitelist.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, comment: '설명' }),
    __metadata("design:type", String)
], IpWhitelist.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true, comment: '활성화 여부' }),
    __metadata("design:type", Boolean)
], IpWhitelist.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '생성 일시' }),
    __metadata("design:type", Date)
], IpWhitelist.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정 일시' }),
    __metadata("design:type", Date)
], IpWhitelist.prototype, "updatedAt", void 0);
exports.IpWhitelist = IpWhitelist = __decorate([
    (0, typeorm_1.Entity)('ip_whitelist', { comment: 'Collector 소스 IP 화이트리스트 (Redis 캐싱 기준 원본)' })
], IpWhitelist);
//# sourceMappingURL=ip-whitelist.entity.js.map