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
exports.Alert = exports.AlertStatus = exports.AlertSeverity = void 0;
const typeorm_1 = require("typeorm");
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "LOW";
    AlertSeverity["MEDIUM"] = "MEDIUM";
    AlertSeverity["HIGH"] = "HIGH";
    AlertSeverity["CRITICAL"] = "CRITICAL";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["OPEN"] = "OPEN";
    AlertStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["FALSE_POSITIVE"] = "FALSE_POSITIVE";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
let Alert = class Alert {
    id;
    title;
    description;
    severity;
    status;
    ruleId;
    sourceIp;
    assignedTo;
    createdAt;
    updatedAt;
};
exports.Alert = Alert;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '알람 고유 ID' }),
    __metadata("design:type", Number)
], Alert.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '알람 제목' }),
    __metadata("design:type", String)
], Alert.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '알람 설명' }),
    __metadata("design:type", String)
], Alert.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AlertSeverity,
        default: AlertSeverity.MEDIUM,
        comment: '위험도: LOW | MEDIUM | HIGH | CRITICAL',
    }),
    __metadata("design:type", String)
], Alert.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AlertStatus,
        default: AlertStatus.OPEN,
        comment: '처리 상태: OPEN | IN_PROGRESS | RESOLVED | FALSE_POSITIVE',
    }),
    __metadata("design:type", String)
], Alert.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rule_id', nullable: true, comment: '트리거된 탐지 룰 ID' }),
    __metadata("design:type", String)
], Alert.prototype, "ruleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_ip', nullable: true, comment: '출발지 IP' }),
    __metadata("design:type", String)
], Alert.prototype, "sourceIp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_to', nullable: true, comment: '담당자 사용자 ID' }),
    __metadata("design:type", Number)
], Alert.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '생성 일시' }),
    __metadata("design:type", Date)
], Alert.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정 일시' }),
    __metadata("design:type", Date)
], Alert.prototype, "updatedAt", void 0);
exports.Alert = Alert = __decorate([
    (0, typeorm_1.Entity)('alerts', { comment: '보안 알람 이벤트' })
], Alert);
//# sourceMappingURL=alert.entity.js.map