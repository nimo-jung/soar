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
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const collectors_controller_1 = require("./collectors/collectors.controller");
const collectors_service_1 = require("./collectors/collectors.service");
const ip_whitelist_controller_1 = require("./ip-whitelist/ip-whitelist.controller");
const ip_whitelist_service_1 = require("./ip-whitelist/ip-whitelist.service");
const playbooks_controller_1 = require("./playbooks/playbooks.controller");
const playbooks_service_1 = require("./playbooks/playbooks.service");
let TenantModule = class TenantModule {
};
exports.TenantModule = TenantModule;
exports.TenantModule = TenantModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET', 'default_secret'),
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [collectors_controller_1.CollectorsController, ip_whitelist_controller_1.IpWhitelistController, playbooks_controller_1.PlaybooksController],
        providers: [collectors_service_1.CollectorsService, ip_whitelist_service_1.IpWhitelistService, playbooks_service_1.PlaybooksService],
    })
], TenantModule);
//# sourceMappingURL=tenant.module.js.map