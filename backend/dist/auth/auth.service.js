"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const master_user_entity_1 = require("../admin/master-users/entities/master-user.entity");
const tenant_entity_1 = require("../admin/tenants/entities/tenant.entity");
const tenant_settings_entity_1 = require("../admin/tenants/entities/tenant-settings.entity");
const tenant_connection_service_1 = require("../common/database/tenant-connection.service");
const tenant_user_entity_1 = require("../tenant/users/entities/tenant-user.entity");
let AuthService = class AuthService {
    masterUserRepo;
    tenantRepo;
    tenantSettingsRepo;
    tenantConnectionService;
    jwtService;
    constructor(masterUserRepo, tenantRepo, tenantSettingsRepo, tenantConnectionService, jwtService) {
        this.masterUserRepo = masterUserRepo;
        this.tenantRepo = tenantRepo;
        this.tenantSettingsRepo = tenantSettingsRepo;
        this.tenantConnectionService = tenantConnectionService;
        this.jwtService = jwtService;
    }
    async loginAsMaster(dto) {
        const user = await this.masterUserRepo.findOne({
            where: { email: dto.email, isActive: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const payload = { sub: user.id, isMaster: true, role: 'master' };
        return { accessToken: this.jwtService.sign(payload) };
    }
    async loginAsTenant(dto) {
        const tenant = await this.tenantRepo.findOne({
            where: { slug: dto.tenantSlug, status: 'ACTIVE' },
        });
        if (!tenant) {
            throw new common_1.UnauthorizedException('테넌트를 찾을 수 없거나 비활성 상태입니다.');
        }
        const conn = await this.tenantConnectionService.getConnection(tenant.slug.replace(/-/g, '_'));
        const tenantUserRepo = conn.getRepository(tenant_user_entity_1.TenantUser);
        const user = await tenantUserRepo.findOne({
            where: { email: dto.email, isActive: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const settings = await this.tenantSettingsRepo.findOne({
            where: { tenantId: tenant.id },
        });
        const payload = {
            sub: user.id,
            tenantId: tenant.slug.replace(/-/g, '_'),
            role: user.role,
            isMaster: false,
        };
        return {
            accessToken: this.jwtService.sign(payload),
            brandingConfig: settings?.brandingConfig ?? null,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(master_user_entity_1.MasterUser)),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __param(2, (0, typeorm_1.InjectRepository)(tenant_settings_entity_1.TenantSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        tenant_connection_service_1.TenantConnectionService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map