import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { TenantSettings } from './entities/tenant-settings.entity';
import { UsageSnapshot } from './entities/usage-snapshot.entity';
import { TenantTier } from './entities/tenant-tier.entity';
import { TenantBootstrapToken } from './entities/tenant-bootstrap-token.entity';
import { TenantPasswordResetToken } from './entities/tenant-password-reset-token.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { BootstrapTokenMailService } from './bootstrap-token-mail.service';
import { MasterSetting } from '../auth-settings/entities/master-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      TenantSettings,
      UsageSnapshot,
      TenantTier,
      TenantBootstrapToken,
      TenantPasswordResetToken,
      MasterSetting,
      AuditLog,
    ]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, AuditLogService, BootstrapTokenMailService],
  exports: [TenantsService],
})
export class TenantsModule {}
