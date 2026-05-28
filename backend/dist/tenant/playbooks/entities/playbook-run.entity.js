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
exports.PlaybookRun = exports.PlaybookRunStatus = void 0;
const typeorm_1 = require("typeorm");
var PlaybookRunStatus;
(function (PlaybookRunStatus) {
    PlaybookRunStatus["RUNNING"] = "RUNNING";
    PlaybookRunStatus["COMPLETED"] = "COMPLETED";
    PlaybookRunStatus["FAILED"] = "FAILED";
})(PlaybookRunStatus || (exports.PlaybookRunStatus = PlaybookRunStatus = {}));
let PlaybookRun = class PlaybookRun {
    id;
    playbookId;
    alertId;
    status;
    resultSummary;
    startedAt;
    finishedAt;
    createdAt;
};
exports.PlaybookRun = PlaybookRun;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '실행 고유 ID' }),
    __metadata("design:type", Number)
], PlaybookRun.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'playbook_id', comment: '실행된 플레이북 ID' }),
    __metadata("design:type", Number)
], PlaybookRun.prototype, "playbookId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'alert_id', type: 'int', nullable: true, comment: '트리거된 알람 ID' }),
    __metadata("design:type", Object)
], PlaybookRun.prototype, "alertId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PlaybookRunStatus,
        default: PlaybookRunStatus.RUNNING,
        comment: '실행 상태',
    }),
    __metadata("design:type", String)
], PlaybookRun.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result_summary', type: 'json', nullable: true, comment: '실행 결과 요약' }),
    __metadata("design:type", Object)
], PlaybookRun.prototype, "resultSummary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'datetime', comment: '실행 시작 일시' }),
    __metadata("design:type", Date)
], PlaybookRun.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'finished_at', type: 'datetime', nullable: true, comment: '실행 완료 일시' }),
    __metadata("design:type", Object)
], PlaybookRun.prototype, "finishedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', comment: '레코드 생성 일시' }),
    __metadata("design:type", Date)
], PlaybookRun.prototype, "createdAt", void 0);
exports.PlaybookRun = PlaybookRun = __decorate([
    (0, typeorm_1.Entity)('playbook_runs', { comment: '플레이북 실행 이력' })
], PlaybookRun);
//# sourceMappingURL=playbook-run.entity.js.map