import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { ClickHouseRawLogsService } from './clickhouse-raw-logs.service';
import { UsageSnapshot } from '../tenants/entities/usage-snapshot.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UsageSnapshot, AuditLog, Tenant]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, ClickHouseRawLogsService],
})
export class MonitoringModule {}