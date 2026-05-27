import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { TenantConnectionService } from './tenant-connection.service';

/**
 * DatabaseModule: tms_admin DB 연결(Global) + 테넌트별 동적 연결 팩토리 제공
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const isDevelopment = config.get<string>('NODE_ENV', 'development') === 'development';

        return {
          type: 'mysql',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 3306),
          username: config.get<string>('DB_USER', 'tms'),
          password: config.get<string>('DB_PASSWORD', 'tmspassword'),
          database: 'tms_admin',
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          migrations: [path.join(__dirname, '../../database/migrations/admin/**/*{.ts,.js}')],
          synchronize: false,
          migrationsRun: isDevelopment,
          charset: 'utf8mb4',
          timezone: '+00:00',
          extra: {
            connectionLimit: 10,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TenantConnectionService],
  exports: [TenantConnectionService],
})
export class DatabaseModule {}
