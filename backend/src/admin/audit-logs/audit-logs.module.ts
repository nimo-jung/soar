import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../../common/audit/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogService],
})
export class AuditLogsModule {}
