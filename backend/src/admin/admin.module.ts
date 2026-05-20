import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantsModule } from './tenants/tenants.module';
import { ThreatIntelModule } from './threat-intel/threat-intel.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { MasterUsersModule } from './master-users/master-users.module';
import { MasterAuthSettings } from '../auth/entities/master-auth-settings.entity';
import { AdminAuthSettingsController } from './auth-settings/auth-settings.controller';
import { AdminAuthSettingsService } from './auth-settings/auth-settings.service';
import { AuditLog } from '../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../common/audit/audit-log.service';
import { ProductInfoModule } from './product-info/product-info.module';

@Module({
  imports: [
    TenantsModule,
    ThreatIntelModule,
    AuditLogsModule,
    MasterUsersModule,
    ProductInfoModule,
    TypeOrmModule.forFeature([MasterAuthSettings, AuditLog]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuthSettingsController],
  providers: [AdminAuthSettingsService, AuditLogService],
  exports: [TenantsModule],
})
export class AdminModule {}
