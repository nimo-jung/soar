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
exports.MasterUser = void 0;
const typeorm_1 = require("typeorm");
let MasterUser = class MasterUser {
    id;
    email;
    passwordHash;
    isActive;
    createdAt;
    updatedAt;
};
exports.MasterUser = MasterUser;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '계정 고유 ID' }),
    __metadata("design:type", Number)
], MasterUser.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, comment: '로그인 이메일' }),
    __metadata("design:type", String)
], MasterUser.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '비밀번호 해시 (bcrypt)' }),
    __metadata("design:type", String)
], MasterUser.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, comment: '계정 활성 여부' }),
    __metadata("design:type", Boolean)
], MasterUser.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '생성 일시' }),
    __metadata("design:type", Date)
], MasterUser.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정 일시' }),
    __metadata("design:type", Date)
], MasterUser.prototype, "updatedAt", void 0);
exports.MasterUser = MasterUser = __decorate([
    (0, typeorm_1.Entity)('master_users', { comment: '마스터 관리자 계정 (soar_admin DB)' })
], MasterUser);
//# sourceMappingURL=master-user.entity.js.map