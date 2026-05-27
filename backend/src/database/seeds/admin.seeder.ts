import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MasterUser, MasterUserStatus } from '../../admin/master-users/entities/master-user.entity';
import AdminDataSource from '../admin-data-source';

/**
 * AdminSeeder: tms_admin DB 초기 데이터 삽입
 * - 최고 관리자 계정 생성 (이미 존재할 경우 스킵)
 * - 멱등성 보장: 중복 실행 시 오류 없음
 */
export async function runAdminSeed(dataSource: DataSource): Promise<void> {
  const masterUserRepo = dataSource.getRepository(MasterUser);

  const existing = await masterUserRepo.findOne({
    where: { email: process.env.MASTER_ADMIN_EMAIL ?? 'admin@tms.io' },
  });

  if (existing) {
    console.log('[Seed] 마스터 관리자 계정이 이미 존재합니다. 스킵합니다.');
    return;
  }

  const password = process.env.MASTER_ADMIN_PASSWORD ?? 'ChangeMe1234!';
  const passwordHash = await bcrypt.hash(password, 12);

  await masterUserRepo.save(
    masterUserRepo.create({
      email: process.env.MASTER_ADMIN_EMAIL ?? 'admin@tms.io',
      passwordHash,
      isActive: true,
      status: MasterUserStatus.ACTIVE,
      deletedAt: null,
    }),
  );

  console.log('[Seed] 마스터 관리자 계정이 생성되었습니다.');
  console.log(`[Seed] Email: ${process.env.MASTER_ADMIN_EMAIL ?? 'admin@tms.io'}`);
  console.log('[Seed] 운영 환경에서는 반드시 비밀번호를 변경하세요.');
}

async function runAdminSeedCli(): Promise<void> {
  if (!AdminDataSource.isInitialized) {
    await AdminDataSource.initialize();
  }

  try {
    await runAdminSeed(AdminDataSource);
  } finally {
    if (AdminDataSource.isInitialized) {
      await AdminDataSource.destroy();
    }
  }
}

if (require.main === module) {
  runAdminSeedCli().catch((error) => {
    console.error('[Seed] Admin seed 실행 실패:', error);
    process.exit(1);
  });
}
