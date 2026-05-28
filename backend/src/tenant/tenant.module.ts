import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CollectorsController } from './collectors/collectors.controller';
import { CollectorsService } from './collectors/collectors.service';
import { IpWhitelistController } from './ip-whitelist/ip-whitelist.controller';
import { IpWhitelistService } from './ip-whitelist/ip-whitelist.service';
import { PlaybooksController } from './playbooks/playbooks.controller';
import { PlaybooksService } from './playbooks/playbooks.service';
import { Tenant } from '../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../admin/tenants/entities/tenant-settings.entity';
import { TenantAuthSettingsController } from './auth-settings/auth-settings.controller';
import { TenantAuthSettingsService } from './auth-settings/auth-settings.service';
import { AuditLog } from '../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../common/audit/audit-log.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { AlertsController } from './alerts/alerts.controller';
import { AlertsService } from './alerts/alerts.service';
import { ParsingRulesController } from './parsing-rules/parsing-rules.controller';
import { ParsingRulesService } from './parsing-rules/parsing-rules.service';
import { TenantMiddleware } from '../common/middleware/tenant.middleware';
import { TenantAuditLogsController } from './audit-logs/tenant-audit-logs.controller';
import { TenantAuditLogsService } from './audit-logs/tenant-audit-logs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantSettings, AuditLog]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    CollectorsController,
    IpWhitelistController,
    PlaybooksController,
    TenantAuthSettingsController,
    UsersController,
    AlertsController,
    ParsingRulesController,
    TenantAuditLogsController,
  ],
  providers: [
    CollectorsService,
    IpWhitelistService,
    PlaybooksService,
    TenantAuthSettingsService,
    UsersService,
    AlertsService,
    ParsingRulesService,
    TenantAuditLogsService,
    AuditLogService,
    TenantMiddleware,
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .forRoutes(
        CollectorsController,
        IpWhitelistController,
        PlaybooksController,
        TenantAuthSettingsController,
        UsersController,
        AlertsController,
        ParsingRulesController,
        TenantAuditLogsController,
      );
  }
}
