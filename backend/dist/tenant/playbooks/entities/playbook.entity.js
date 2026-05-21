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
exports.Playbook = exports.PlaybookStatus = void 0;
const typeorm_1 = require("typeorm");
var PlaybookStatus;
(function (PlaybookStatus) {
    PlaybookStatus["DRAFT"] = "DRAFT";
    PlaybookStatus["ACTIVE"] = "ACTIVE";
    PlaybookStatus["ARCHIVED"] = "ARCHIVED";
})(PlaybookStatus || (exports.PlaybookStatus = PlaybookStatus = {}));
let Playbook = class Playbook {
    id;
    name;
    description;
    definition;
    status;
    createdBy;
    createdAt;
    updatedAt;
};
exports.Playbook = Playbook;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '플레이북 고유 ID' }),
    __metadata("design:type", Number)
], Playbook.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '플레이북 이름' }),
    __metadata("design:type", String)
], Playbook.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '플레이북 설명' }),
    __metadata("design:type", String)
], Playbook.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'json',
        comment: '워크플로우 정의 JSON (트리거 조건 + 액션 스텝)',
    }),
    __metadata("design:type", Object)
], Playbook.prototype, "definition", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PlaybookStatus,
        default: PlaybookStatus.DRAFT,
        comment: '상태: DRAFT | ACTIVE | ARCHIVED',
    }),
    __metadata("design:type", String)
], Playbook.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true, comment: '작성자 사용자 ID' }),
    __metadata("design:type", Number)
], Playbook.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '생성 일시' }),
    __metadata("design:type", Date)
], Playbook.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정 일시' }),
    __metadata("design:type", Date)
], Playbook.prototype, "updatedAt", void 0);
exports.Playbook = Playbook = __decorate([
    (0, typeorm_1.Entity)('playbooks', { comment: 'TMS 자동 대응 플레이북 정의' })
], Playbook);
//# sourceMappingURL=playbook.entity.js.map