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
exports.ThreatIntelFeed = exports.TiDispatchStatus = void 0;
const typeorm_1 = require("typeorm");
var TiDispatchStatus;
(function (TiDispatchStatus) {
    TiDispatchStatus["PENDING"] = "PENDING";
    TiDispatchStatus["DISPATCHED"] = "DISPATCHED";
    TiDispatchStatus["FAILED"] = "FAILED";
})(TiDispatchStatus || (exports.TiDispatchStatus = TiDispatchStatus = {}));
let ThreatIntelFeed = class ThreatIntelFeed {
    id;
    feedType;
    indicator;
    severity;
    description;
    source;
    isActive;
    dispatchStatus;
    dispatchedAt;
    dispatchError;
    dispatchAttempts;
    expiresAt;
    createdAt;
    updatedAt;
};
exports.ThreatIntelFeed = ThreatIntelFeed;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: 'TI 피드 고유 ID' }),
    __metadata("design:type", Number)
], ThreatIntelFeed.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '피드 유형 (IP, DOMAIN, HASH, URL 등)' }),
    __metadata("design:type", String)
], ThreatIntelFeed.prototype, "feedType", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '위협 지표 값' }),
    __metadata("design:type", String)
], ThreatIntelFeed.prototype, "indicator", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, comment: '위협 수준 (LOW, MEDIUM, HIGH, CRITICAL)' }),
    __metadata("design:type", String)
], ThreatIntelFeed.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '위협 설명' }),
    __metadata("design:type", String)
], ThreatIntelFeed.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, comment: '출처' }),
    __metadata("design:type", String)
], ThreatIntelFeed.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true, comment: '활성화 여부' }),
    __metadata("design:type", Boolean)
], ThreatIntelFeed.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'dispatch_status',
        type: 'enum',
        enum: TiDispatchStatus,
        default: TiDispatchStatus.PENDING,
        comment: 'RedPanda 전파 상태: PENDING | DISPATCHED | FAILED',
    }),
    __metadata("design:type", String)
], ThreatIntelFeed.prototype, "dispatchStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dispatched_at', type: 'datetime', nullable: true, comment: '전파 완료 일시' }),
    __metadata("design:type", Object)
], ThreatIntelFeed.prototype, "dispatchedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dispatch_error', type: 'text', nullable: true, comment: '전파 실패 오류 메시지' }),
    __metadata("design:type", Object)
], ThreatIntelFeed.prototype, "dispatchError", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dispatch_attempts', type: 'int', default: 0, comment: '전파 시도 횟수' }),
    __metadata("design:type", Number)
], ThreatIntelFeed.prototype, "dispatchAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'datetime', nullable: true, comment: '만료 일시' }),
    __metadata("design:type", Object)
], ThreatIntelFeed.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '등록 일시' }),
    __metadata("design:type", Date)
], ThreatIntelFeed.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정 일시' }),
    __metadata("design:type", Date)
], ThreatIntelFeed.prototype, "updatedAt", void 0);
exports.ThreatIntelFeed = ThreatIntelFeed = __decorate([
    (0, typeorm_1.Entity)('threat_intel_feeds', { comment: '글로벌 위협 인텔리전스(TI) 피드 레지스트리' })
], ThreatIntelFeed);
//# sourceMappingURL=threat-intel-feed.entity.js.map