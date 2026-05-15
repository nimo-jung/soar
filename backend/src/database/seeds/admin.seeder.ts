import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MasterUser } from '../../admin/master-users/entities/master-user.entity';

/**
 * AdminSeeder: soar_admin DB 초기 데이터 삽입
 * - 최고 관리자 계정 생성 (이미 존재할 경우 스킵)
 * - 멱등성 보장: 중복 실행 시 오류 없음
 */
export async function runAdminSeed(dataSource: DataSource): Promise<void> {
  const masterUserRepo = dataSource.getRepository(MasterUser);

  const existing = await masterUserRepo.findOne({
    where: { email: process.env.MASTER_ADMIN_EMAIL ?? 'admin@soar.io' },
  });

  if (existing) {
    console.log('[Seed] 마스터 관리자 계정이 이미 존재합니다. 스킵합니다.');
    return;
  }

  const password = process.env.MASTER_ADMIN_PASSWORD ?? 'ChangeMe1234!';
  const passwordHash = await bcrypt.hash(password, 12);

  await masterUserRepo.save(
    masterUserRepo.create({
      email: process.env.MASTER_ADMIN_EMAIL ?? 'admin@soar.io',
      passwordHash,
      isActive: true,
    }),
  );

  console.log('[Seed] 마스터 관리자 계정이 생성되었습니다.');
  console.log(`[Seed] Email: ${process.env.MASTER_ADMIN_EMAIL ?? 'admin@soar.io'}`);
  console.log('[Seed] 운영 환경에서는 반드시 비밀번호를 변경하세요.');
}
