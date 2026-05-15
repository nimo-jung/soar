"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const tenants_controller_1 = require("./tenants.controller");
const tenants_service_1 = require("./tenants.service");
const tenant_entity_1 = require("./entities/tenant.entity");
const tenant_settings_entity_1 = require("./entities/tenant-settings.entity");
const usage_snapshot_entity_1 = require("./entities/usage-snapshot.entity");
let TenantsModule = class TenantsModule {
};
exports.TenantsModule = TenantsModule;
exports.TenantsModule = TenantsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([tenant_entity_1.Tenant, tenant_settings_entity_1.TenantSettings, usage_snapshot_entity_1.UsageSnapshot]),
            jwt_1.JwtModule.registerAsync({
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET', 'default_secret'),
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [tenants_controller_1.TenantsController],
        providers: [tenants_service_1.TenantsService],
        exports: [tenants_service_1.TenantsService],
    })
], TenantsModule);
//# sourceMappingURL=tenants.module.js.map