import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantsModule } from './tenants/tenants.module';
import { ThreatIntelModule } from './threat-intel/threat-intel.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { MasterUsersModule } from './master-users/master-users.module';
import { MasterAuthSettings } from '../auth/entities/master-auth-settings.entity';
import { MasterSetting } from './auth-settings/entities/master-setting.entity';
import { AdminAuthSettingsController } from './auth-settings/auth-settings.controller';
import { AdminAuthSettingsService } from './auth-settings/auth-settings.service';
import { SmtpSettingsController } from './smtp-settings/smtp-settings.controller';
import { SmtpSettingsService } from './smtp-settings/smtp-settings.service';
import { AuditLog } from '../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../common/audit/audit-log.service';
import { ProductInfoModule } from './product-info/product-info.module';
import { BillingModule } from './billing/billing.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { QuotasModule } from './quotas/quotas.module';
import { DataIsolationModule } from './data-isolation/data-isolation.module';
import { SystemStatusModule } from './system-status/system-status.module';
import { IntegrityModule } from './integrity/integrity.module';
import { Tenant } from './tenants/entities/tenant.entity';

@Module({
  imports: [
    TenantsModule,
    ThreatIntelModule,
    AuditLogsModule,
    MasterUsersModule,
    ProductInfoModule,
    BillingModule,
    MonitoringModule,
    QuotasModule,
    DataIsolationModule,
    SystemStatusModule,
    IntegrityModule,
    TypeOrmModule.forFeature([MasterAuthSettings, MasterSetting, AuditLog, Tenant]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuthSettingsController, SmtpSettingsController],
  providers: [AdminAuthSettingsService, SmtpSettingsService, AuditLogService],
  exports: [TenantsModule],
})
export class AdminModule {}
