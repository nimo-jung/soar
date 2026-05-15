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
exports.UsageSnapshot = void 0;
const typeorm_1 = require("typeorm");
let UsageSnapshot = class UsageSnapshot {
    id;
    tenantId;
    epsAvg;
    storageUsedGb;
    logCount;
    snapshotAt;
    createdAt;
};
exports.UsageSnapshot = UsageSnapshot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '스냅샷 고유 ID' }),
    __metadata("design:type", Number)
], UsageSnapshot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', comment: '대상 테넌트 ID' }),
    __metadata("design:type", Number)
], UsageSnapshot.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'eps_avg', type: 'float', default: 0, comment: '평균 EPS' }),
    __metadata("design:type", Number)
], UsageSnapshot.prototype, "epsAvg", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'storage_used_gb',
        type: 'float',
        default: 0,
        comment: '실제 사용 스토리지 (GB)',
    }),
    __metadata("design:type", Number)
], UsageSnapshot.prototype, "storageUsedGb", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'log_count',
        type: 'bigint',
        default: 0,
        comment: '해당 집계 기간 총 로그 건수',
    }),
    __metadata("design:type", Number)
], UsageSnapshot.prototype, "logCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'snapshot_at', type: 'datetime', comment: '집계 기준 일시' }),
    __metadata("design:type", Date)
], UsageSnapshot.prototype, "snapshotAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '레코드 생성 일시' }),
    __metadata("design:type", Date)
], UsageSnapshot.prototype, "createdAt", void 0);
exports.UsageSnapshot = UsageSnapshot = __decorate([
    (0, typeorm_1.Entity)('usage_snapshots', { comment: 'EPS·스토리지 실사용량 배치 집계 테이블 (빌링 데이터)' }),
    (0, typeorm_1.Index)(['tenantId', 'snapshotAt'])
], UsageSnapshot);
//# sourceMappingURL=usage-snapshot.entity.js.map