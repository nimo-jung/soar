"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const tenants_module_1 = require("./tenants/tenants.module");
const threat_intel_module_1 = require("./threat-intel/threat-intel.module");
const audit_logs_module_1 = require("./audit-logs/audit-logs.module");
const master_users_module_1 = require("./master-users/master-users.module");
const master_auth_settings_entity_1 = require("../auth/entities/master-auth-settings.entity");
const auth_settings_controller_1 = require("./auth-settings/auth-settings.controller");
const auth_settings_service_1 = require("./auth-settings/auth-settings.service");
const audit_log_entity_1 = require("../common/audit/entities/audit-log.entity");
const audit_log_service_1 = require("../common/audit/audit-log.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            tenants_module_1.TenantsModule,
            threat_intel_module_1.ThreatIntelModule,
            audit_logs_module_1.AuditLogsModule,
            master_users_module_1.MasterUsersModule,
            typeorm_1.TypeOrmModule.forFeature([master_auth_settings_entity_1.MasterAuthSettings, audit_log_entity_1.AuditLog]),
            jwt_1.JwtModule.registerAsync({
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET', 'default_secret'),
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [auth_settings_controller_1.AdminAuthSettingsController],
        providers: [auth_settings_service_1.AdminAuthSettingsService, audit_log_service_1.AuditLogService],
        exports: [tenants_module_1.TenantsModule],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map