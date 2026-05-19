"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const threat_intel_controller_1 = require("./threat-intel.controller");
const threat_intel_service_1 = require("./threat-intel.service");
const threat_intel_feed_entity_1 = require("./entities/threat-intel-feed.entity");
const audit_log_entity_1 = require("../../common/audit/entities/audit-log.entity");
const audit_log_service_1 = require("../../common/audit/audit-log.service");
let ThreatIntelModule = class ThreatIntelModule {
};
exports.ThreatIntelModule = ThreatIntelModule;
exports.ThreatIntelModule = ThreatIntelModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([threat_intel_feed_entity_1.ThreatIntelFeed, audit_log_entity_1.AuditLog]),
            jwt_1.JwtModule.registerAsync({
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET', 'default_secret'),
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [threat_intel_controller_1.ThreatIntelController],
        providers: [threat_intel_service_1.ThreatIntelService, audit_log_service_1.AuditLogService],
    })
], ThreatIntelModule);
//# sourceMappingURL=threat-intel.module.js.map