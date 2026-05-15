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
exports.AlertNotification = void 0;
const typeorm_1 = require("typeorm");
let AlertNotification = class AlertNotification {
    id;
    alertId;
    channel;
    recipient;
    isSuccess;
    errorMessage;
    createdAt;
};
exports.AlertNotification = AlertNotification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '발송 이력 고유 ID' }),
    __metadata("design:type", Number)
], AlertNotification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'alert_id', comment: '대상 알람 ID' }),
    __metadata("design:type", Number)
], AlertNotification.prototype, "alertId", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '발송 채널 (EMAIL, SLACK, SMS)' }),
    __metadata("design:type", String)
], AlertNotification.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '수신자 (이메일 주소, 슬랙 채널명 등)' }),
    __metadata("design:type", String)
], AlertNotification.prototype, "recipient", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_success', default: true, comment: '발송 성공 여부' }),
    __metadata("design:type", Boolean)
], AlertNotification.prototype, "isSuccess", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true, comment: '실패 시 오류 메시지' }),
    __metadata("design:type", Object)
], AlertNotification.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '발송 일시' }),
    __metadata("design:type", Date)
], AlertNotification.prototype, "createdAt", void 0);
exports.AlertNotification = AlertNotification = __decorate([
    (0, typeorm_1.Entity)('alert_notifications', { comment: '알람 알림 발송 이력 (이메일·슬랙·SMS)' })
], AlertNotification);
//# sourceMappingURL=alert-notification.entity.js.map