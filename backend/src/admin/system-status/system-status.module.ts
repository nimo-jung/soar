import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SystemStatusController } from './system-status.controller';
import { SystemStatusService } from './system-status.service';
import { SystemHealthSnapshot } from './entities/system-health-snapshot.entity';
import { SystemAlertEvent } from './entities/system-alert-event.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../../common/audit/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemHealthSnapshot, SystemAlertEvent, AuditLog]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SystemStatusController],
  providers: [SystemStatusService, AuditLogService],
  exports: [SystemStatusService],
})
export class SystemStatusModule {}
