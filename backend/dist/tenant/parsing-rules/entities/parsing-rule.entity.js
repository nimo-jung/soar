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
exports.ParsingRule = void 0;
const typeorm_1 = require("typeorm");
let ParsingRule = class ParsingRule {
    id;
    name;
    ruleDefinition;
    logSourceType;
    isActive;
    priority;
    createdAt;
    updatedAt;
};
exports.ParsingRule = ParsingRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ comment: '규칙 고유 ID' }),
    __metadata("design:type", Number)
], ParsingRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: '규칙 이름' }),
    __metadata("design:type", String)
], ParsingRule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rule_definition', type: 'json', comment: '파싱 규칙 정의 (JSON 구조)' }),
    __metadata("design:type", Object)
], ParsingRule.prototype, "ruleDefinition", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'log_source_type', nullable: true, comment: '적용 대상 로그 소스 유형' }),
    __metadata("design:type", String)
], ParsingRule.prototype, "logSourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true, comment: '활성화 여부' }),
    __metadata("design:type", Boolean)
], ParsingRule.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, comment: '적용 우선순위 (낮을수록 먼저 적용)' }),
    __metadata("design:type", Number)
], ParsingRule.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', comment: '생성 일시' }),
    __metadata("design:type", Date)
], ParsingRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', comment: '수정 일시' }),
    __metadata("design:type", Date)
], ParsingRule.prototype, "updatedAt", void 0);
exports.ParsingRule = ParsingRule = __decorate([
    (0, typeorm_1.Entity)('parsing_rules', { comment: '테넌트별 커스텀 로그 파싱 룰 (Go 엔진 Redis 캐싱)' })
], ParsingRule);
//# sourceMappingURL=parsing-rule.entity.js.map