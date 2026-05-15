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
exports.TenantUser = void 0;
const typeorm_1 = require("typeorm");
const roles_guard_1 = require("../../../common/guards/roles.guard");
let TenantUser = class TenantUser {
    id;
    email;
    passwordHash;
    displayName;
    role;
    isActive;
    createdAt;
    updatedAt;
};
exports.TenantUser = TenantUser;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '사용자 고유 ID' }),
    __metadata("design:type", Number)
], TenantUser.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, comment: '로그인 이메일' }),
    __metadata("design:type", String)
], TenantUser.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '비밀번호 해시 (bcrypt)' }),
    __metadata("design:type", String)
], TenantUser.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '표시 이름' }),
    __metadata("design:type", String)
], TenantUser.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: roles_guard_1.TenantRole,
        default: roles_guard_1.TenantRole.ANALYST,
        comment: '역할: operator(운영자) | analyst(분석가) | auditor(감사자)',
    }),
    __metadata("design:type", String)
], TenantUser.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true, comment: '계정 활성화 여부' }),
    __metadata("design:type", Boolean)
], TenantUser.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '생성 일시' }),
    __metadata("design:type", Date)
], TenantUser.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '수정 일시' }),
    __metadata("design:type", Date)
], TenantUser.prototype, "updatedAt", void 0);
exports.TenantUser = TenantUser = __decorate([
    (0, typeorm_1.Entity)('tenant_users', { comment: '테넌트 내 사용자 계정 및 역할 (RBAC)' })
], TenantUser);
//# sourceMappingURL=tenant-user.entity.js.map