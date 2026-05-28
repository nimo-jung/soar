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
exports.TenantConnectionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
const path = __importStar(require("path"));
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
            migrations: [path.join(__dirname, '../../database/migrations/tenant/**/*{.ts,.js}')],
            synchronize: false,
            charset: 'utf8mb4',
            timezone: '+00:00',
            extra: {
                connectionLimit: 5,
            },
        });
        await dataSource.initialize();
        if (this.shouldAutoRunTenantMigrations()) {
            await dataSource.runMigrations();
        }
        this.connections.set(tenantId, dataSource);
        return dataSource;
    }
    shouldAutoRunTenantMigrations() {
        const explicit = this.config.get('TENANT_MIGRATIONS_RUN_ON_CONNECT');
        if (explicit !== undefined) {
            return explicit.toLowerCase() === 'true';
        }
        return (this.config.get('NODE_ENV') ?? 'development') === 'development';
    }
    async closeConnection(tenantId) {
        const conn = this.connections.get(tenantId);
        if (conn?.isInitialized) {
            await conn.destroy();
            this.connections.delete(tenantId);
        }
    }
    async runMigrationsForTenant(tenantId) {
        const conn = await this.getConnection(tenantId);
        await conn.runMigrations();
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