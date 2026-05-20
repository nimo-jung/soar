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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAdminSeed = runAdminSeed;
const bcrypt = __importStar(require("bcrypt"));
const master_user_entity_1 = require("../../admin/master-users/entities/master-user.entity");
const admin_data_source_1 = __importDefault(require("../admin-data-source"));
async function runAdminSeed(dataSource) {
    const masterUserRepo = dataSource.getRepository(master_user_entity_1.MasterUser);
    const existing = await masterUserRepo.findOne({
        where: { email: process.env.MASTER_ADMIN_EMAIL ?? 'admin@soar.io' },
    });
    if (existing) {
        console.log('[Seed] 마스터 관리자 계정이 이미 존재합니다. 스킵합니다.');
        return;
    }
    const password = process.env.MASTER_ADMIN_PASSWORD ?? 'ChangeMe1234!';
    const passwordHash = await bcrypt.hash(password, 12);
    await masterUserRepo.save(masterUserRepo.create({
        email: process.env.MASTER_ADMIN_EMAIL ?? 'admin@soar.io',
        passwordHash,
        isActive: true,
        status: master_user_entity_1.MasterUserStatus.ACTIVE,
        deletedAt: null,
    }));
    console.log('[Seed] 마스터 관리자 계정이 생성되었습니다.');
    console.log(`[Seed] Email: ${process.env.MASTER_ADMIN_EMAIL ?? 'admin@soar.io'}`);
    console.log('[Seed] 운영 환경에서는 반드시 비밀번호를 변경하세요.');
}
async function runAdminSeedCli() {
    if (!admin_data_source_1.default.isInitialized) {
        await admin_data_source_1.default.initialize();
    }
    try {
        await runAdminSeed(admin_data_source_1.default);
    }
    finally {
        if (admin_data_source_1.default.isInitialized) {
            await admin_data_source_1.default.destroy();
        }
    }
}
if (require.main === module) {
    runAdminSeedCli().catch((error) => {
        console.error('[Seed] Admin seed 실행 실패:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=admin.seeder.js.map