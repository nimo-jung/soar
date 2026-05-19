"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const collectors_controller_1 = require("./collectors/collectors.controller");
const collectors_service_1 = require("./collectors/collectors.service");
const ip_whitelist_controller_1 = require("./ip-whitelist/ip-whitelist.controller");
const ip_whitelist_service_1 = require("./ip-whitelist/ip-whitelist.service");
const playbooks_controller_1 = require("./playbooks/playbooks.controller");
const playbooks_service_1 = require("./playbooks/playbooks.service");
const tenant_entity_1 = require("../admin/tenants/entities/tenant.entity");
const tenant_settings_entity_1 = require("../admin/tenants/entities/tenant-settings.entity");
const auth_settings_controller_1 = require("./auth-settings/auth-settings.controller");
const auth_settings_service_1 = require("./auth-settings/auth-settings.service");
const audit_log_entity_1 = require("../common/audit/entities/audit-log.entity");
const audit_log_service_1 = require("../common/audit/audit-log.service");
let TenantModule = class TenantModule {
};
exports.TenantModule = TenantModule;
exports.TenantModule = TenantModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([tenant_entity_1.Tenant, tenant_settings_entity_1.TenantSettings, audit_log_entity_1.AuditLog]),
            jwt_1.JwtModule.registerAsync({
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET', 'default_secret'),
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [
            collectors_controller_1.CollectorsController,
            ip_whitelist_controller_1.IpWhitelistController,
            playbooks_controller_1.PlaybooksController,
            auth_settings_controller_1.TenantAuthSettingsController,
        ],
        providers: [
            collectors_service_1.CollectorsService,
            ip_whitelist_service_1.IpWhitelistService,
            playbooks_service_1.PlaybooksService,
            auth_settings_service_1.TenantAuthSettingsService,
            audit_log_service_1.AuditLogService,
        ],
    })
], TenantModule);
//# sourceMappingURL=tenant.module.js.map