import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MasterSetting } from '../auth-settings/entities/master-setting.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { VectorSettingsController } from './vector-settings.controller';
import { VectorSettingsService } from './vector-settings.service';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { VectorHttpAuthController } from './vector-http-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MasterSetting, AuditLog, TenantSettings, Tenant]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [VectorSettingsController, VectorHttpAuthController],
  providers: [VectorSettingsService, AuditLogService],
})
export class VectorSettingsModule {}
