import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * soar_admin DB 마이그레이션 전용 DataSource
 * TypeORM CLI에서 사용
 */
export const AdminDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER ?? 'soar',
  password: process.env.DB_PASSWORD ?? 'soarpassword',
  database: 'soar_admin',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../database/migrations/admin/**/*{.ts,.js}')],
  synchronize: false,
  charset: 'utf8mb4',
  timezone: '+00:00',
});

/**
 * 테넌트 공통 스키마 마이그레이션 전용 DataSource
 * 새 테넌트 프로비저닝 시 이 마이그레이션들을 tenant_db_* DB에 순차 실행
 */
export const TenantDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER ?? 'soar',
  password: process.env.DB_PASSWORD ?? 'soarpassword',
  database: process.env.TENANT_DB_NAME ?? 'tenant_db_default',
  entities: [path.join(__dirname, '../tenant/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../database/migrations/tenant/**/*{.ts,.js}')],
  synchronize: false,
  charset: 'utf8mb4',
  timezone: '+00:00',
});
