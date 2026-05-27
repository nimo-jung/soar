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
exports.TenantConnectionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
let TenantConnectionService = class TenantConnectionService {
    config;
    connections = new Map();
    constructor(config) {
        this.config = config;
    }
    async getConnection(tenantId) {
        const existing = this.connections.get(tenantId);
        if (existing?.isInitialized) {
            return existing;
        }
        const dbName = `tenant_db_${tenantId}`;
        const dataSource = new typeorm_1.DataSource({
            type: 'mysql',
            host: this.config.get('DB_HOST', 'localhost'),
            port: this.config.get('DB_PORT', 3306),
            username: this.config.get('DB_USER', 'tms'),
            password: this.config.get('DB_PASSWORD', 'tmspassword'),
            database: dbName,
            entities: [__dirname + '/../../tenant/**/*.entity{.ts,.js}'],
            synchronize: false,
            charset: 'utf8mb4',
            timezone: '+00:00',
            extra: {
                connectionLimit: 5,
            },
        });
        await dataSource.initialize();
        this.connections.set(tenantId, dataSource);
        return dataSource;
    }
    async closeConnection(tenantId) {
        const conn = this.connections.get(tenantId);
        if (conn?.isInitialized) {
            await conn.destroy();
            this.connections.delete(tenantId);
        }
    }
    async onModuleDestroy() {
        const closeAll = Array.from(this.connections.values()).map((ds) => ds.isInitialized ? ds.destroy() : Promise.resolve());
        await Promise.all(closeAll);
        this.connections.clear();
    }
};
exports.TenantConnectionService = TenantConnectionService;
exports.TenantConnectionService = TenantConnectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TenantConnectionService);
//# sourceMappingURL=tenant-connection.service.js.map