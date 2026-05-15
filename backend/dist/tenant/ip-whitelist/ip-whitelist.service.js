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
exports.IpWhitelistService = void 0;
const common_1 = require("@nestjs/common");
const tenant_connection_service_1 = require("../../common/database/tenant-connection.service");
const ip_whitelist_entity_1 = require("./entities/ip-whitelist.entity");
const tenant_context_1 = require("../../common/context/tenant.context");
let IpWhitelistService = class IpWhitelistService {
    tenantConn;
    constructor(tenantConn) {
        this.tenantConn = tenantConn;
    }
    async getRepo(tenantId) {
        const conn = await this.tenantConn.getConnection(tenantId);
        return conn.getRepository(ip_whitelist_entity_1.IpWhitelist);
    }
    async findAll() {
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const repo = await this.getRepo(tenantId);
        return repo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
    }
    async create(ipAddress, description) {
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const repo = await this.getRepo(tenantId);
        const entry = repo.create({ ipAddress, description });
        return repo.save(entry);
    }
    async remove(id) {
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const repo = await this.getRepo(tenantId);
        await repo.update(id, { isActive: false });
    }
};
exports.IpWhitelistService = IpWhitelistService;
exports.IpWhitelistService = IpWhitelistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_connection_service_1.TenantConnectionService])
], IpWhitelistService);
//# sourceMappingURL=ip-whitelist.service.js.map