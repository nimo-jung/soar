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
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../../common/audit/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantSettings, UsageSnapshot, TenantTier, AuditLog]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, AuditLogService],
  exports: [TenantsService],
})
export class TenantsModule {}
