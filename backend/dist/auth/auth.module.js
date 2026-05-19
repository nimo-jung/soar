"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const master_user_entity_1 = require("../admin/master-users/entities/master-user.entity");
const tenant_entity_1 = require("../admin/tenants/entities/tenant.entity");
const tenant_settings_entity_1 = require("../admin/tenants/entities/tenant-settings.entity");
const audit_log_entity_1 = require("../common/audit/entities/audit-log.entity");
const audit_log_service_1 = require("../common/audit/audit-log.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([master_user_entity_1.MasterUser, tenant_entity_1.Tenant, tenant_settings_entity_1.TenantSettings, audit_log_entity_1.AuditLog]),
            jwt_1.JwtModule.registerAsync({
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET', 'default_secret'),
                    signOptions: { expiresIn: (config.get('JWT_EXPIRES_IN', '1d')) },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, audit_log_service_1.AuditLogService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map