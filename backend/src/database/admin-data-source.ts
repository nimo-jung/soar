import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * tms_admin DB 마이그레이션 전용 DataSource
 * TypeORM CLI에서 사용
 */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER ?? 'tms',
  password: process.env.DB_PASSWORD ?? 'tmspassword',
  database: 'tms_admin',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, './migrations/admin/**/*{.ts,.js}')],
  synchronize: false,
  charset: 'utf8mb4',
  timezone: '+00:00',
});
