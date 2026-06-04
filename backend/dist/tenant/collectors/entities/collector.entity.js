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
exports.Collector = void 0;
const typeorm_1 = require("typeorm");
let Collector = class Collector {
    id;
    name;
    description;
    deviceCode;
    sourceIp;
    apiKeyHash;
    isActive;
    createdAt;
    updatedAt;
};
exports.Collector = Collector;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: 'Collector 고유 ID' }),
    __metadata("design:type", Number)
], Collector.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: 'Collector 이름' }),
    __metadata("design:type", String)
], Collector.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, comment: '설명' }),
    __metadata("design:type", String)
], Collector.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_code', length: 128, comment: '장비 고유 코드 (라우팅 식별자)' }),
    __metadata("design:type", String)
], Collector.prototype, "deviceCode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        name: 'source_ip',
        nullable: true,
        length: 45,
        comment: '장비 고정 Source IP (선택)',
    }),
    __metadata("design:type", Object)
], Collector.prototype, "sourceIp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'api_key_hash', comment: 'API Key 해시 (bcrypt, 원본 재조회 불가)' }),
    __metadata("design:type", String)
], Collector.prototype, "apiKeyHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true, comment: '활성화 여부' }),
    __metadata("design:type", Boolean)
], Collector.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', comment: '생성 일시' }),
    __metadata("design:type", Date)
], Collector.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', comment: '수정 일시' }),
    __metadata("design:type", Date)
], Collector.prototype, "updatedAt", void 0);
exports.Collector = Collector = __decorate([
    (0, typeorm_1.Entity)('collectors', { comment: '로그 수집 포인트(Collector) 등록 정보' })
], Collector);
//# sourceMappingURL=collector.entity.js.map