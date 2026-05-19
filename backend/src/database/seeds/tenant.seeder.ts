import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantStatus } from '../../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../../admin/tenants/entities/tenant-settings.entity';
import { TenantUser } from '../../tenant/users/entities/tenant-user.entity';
import { TenantRole } from '../../common/guards/roles.guard';

/**
 * TenantSeeder: 개발 환경 전용 데모 테넌트 초기 데이터 삽입
 *
 * 생성 내용:
 *  - 테넌트: slug=demo, 고객사명=SOAR Demo Corp
 *  - DB: tenant_db_demo (없을 경우 생성)
 *  - 사용자:
 *      operator@demo.local / Demo1234!  (role: operator)
 *      analyst@demo.local  / Demo1234!  (role: analyst)
 *      auditor@demo.local  / Demo1234!  (role: auditor)
 *
 * 멱등성 보장: 이미 존재하는 경우 스킵
 */
export async function runTenantSeed(
  adminDataSource: DataSource,
  dbHost: string,
  dbPort: number,
  dbUser: string,
  dbPassword: string,
): Promise<void> {
  const tenantRepo = adminDataSource.getRepository(Tenant);
  const settingsRepo = adminDataSource.getRepository(TenantSettings);

  const DEMO_SLUG = 'demo';
  const DB_NAME = `tenant_db_${DEMO_SLUG}`;

  // ── 1. 테넌트 레코드 생성 ──────────────────────────────
  let tenant = await tenantRepo.findOne({ where: { slug: DEMO_SLUG } });
  if (!tenant) {
    tenant = tenantRepo.create({
      slug: DEMO_SLUG,
      name: 'SOAR Demo Corp',
      contactEmail: 'operator@demo.local',
      ipCidr: '10.0.0.10,10.0.1.0/24',
      status: TenantStatus.ACTIVE,
    });
    tenant = await tenantRepo.save(tenant);

    const settings = settingsRepo.create({ tenantId: tenant.id });
    await settingsRepo.save(settings);

    console.log('[TenantSeed] 데모 테넌트 레코드 생성 완료.');
  } else {
    console.log('[TenantSeed] 데모 테넌트가 이미 존재합니다. 스킵합니다.');
    // DB와 사용자는 없을 수 있으므로 계속 진행
  }

  // ── 2. 테넌트 DB 생성 ─────────────────────────────────
  await adminDataSource.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );

  // ── 3. 테넌트 DB에 접속 후 테이블 동기화 ─────────────
  const tenantDs = new DataSource({
    type: 'mysql',
    host: dbHost,
    port: dbPort,
    username: dbUser,
    password: dbPassword,
    database: DB_NAME,
    entities: [TenantUser],
    synchronize: true, // 개발용: 테이블 자동 생성
    charset: 'utf8mb4',
    timezone: '+00:00',
  });

  await tenantDs.initialize();

  try {
    const userRepo = tenantDs.getRepository(TenantUser);

    // ── 4. 기본 사용자 생성 ──────────────────────────────
    const defaultUsers = [
      { email: 'operator@demo.local', displayName: '운영자', role: TenantRole.OPERATOR },
      { email: 'analyst@demo.local', displayName: '분석가', role: TenantRole.ANALYST },
      { email: 'auditor@demo.local', displayName: '감사자', role: TenantRole.AUDITOR },
    ];

    for (const u of defaultUsers) {
      const exists = await userRepo.findOne({ where: { email: u.email } });
      if (!exists) {
        const passwordHash = await bcrypt.hash('Demo1234!', 12);
        await userRepo.save(
          userRepo.create({ ...u, passwordHash, isActive: true }),
        );
        console.log(`[TenantSeed] 사용자 생성: ${u.email} (${u.role})`);
      }
    }

    console.log('[TenantSeed] 데모 테넌트 사용자 시딩 완료.');
    console.log('[TenantSeed] ──────────────────────────────────────────');
    console.log('[TenantSeed] 테넌트 로그인 테스트 정보:');
    console.log('[TenantSeed]   URL       : http://localhost:5173');
    console.log('[TenantSeed]   슬러그    : demo');
    console.log('[TenantSeed]   이메일    : operator@demo.local');
    console.log('[TenantSeed]   비밀번호  : Demo1234!');
    console.log('[TenantSeed] ──────────────────────────────────────────');
  } finally {
    await tenantDs.destroy();
  }
}
