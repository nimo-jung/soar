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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectorsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const tenant_connection_service_1 = require("../../common/database/tenant-connection.service");
const collector_entity_1 = require("./entities/collector.entity");
const tenant_context_1 = require("../../common/context/tenant.context");
let CollectorsService = class CollectorsService {
    tenantConn;
    constructor(tenantConn) {
        this.tenantConn = tenantConn;
    }
    async getRepo(tenantId) {
        const conn = await this.tenantConn.getConnection(tenantId);
        return conn.getRepository(collector_entity_1.Collector);
    }
    async create(dto) {
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const repo = await this.getRepo(tenantId);
        const plainApiKey = crypto.randomBytes(32).toString('hex');
        const apiKeyHash = await bcrypt.hash(plainApiKey, 12);
        const collector = repo.create({ ...dto, apiKeyHash });
        const saved = await repo.save(collector);
        return { ...saved, plainApiKey };
    }
    async findAll() {
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const repo = await this.getRepo(tenantId);
        return repo.find({ order: { createdAt: 'DESC' } });
    }
    async deactivate(id) {
        const tenantId = tenant_context_1.TenantContext.getTenantId();
        const repo = await this.getRepo(tenantId);
        await repo.update(id, { isActive: false });
    }
};
exports.CollectorsService = CollectorsService;
exports.CollectorsService = CollectorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_connection_service_1.TenantConnectionService])
], CollectorsService);
//# sourceMappingURL=collectors.service.js.map