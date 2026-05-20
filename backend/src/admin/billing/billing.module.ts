import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { UsageSnapshot } from '../tenants/entities/usage-snapshot.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantTier } from '../tenants/entities/tenant-tier.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { UsageSnapshotBatchService } from './usage-snapshot-batch.service';
import { BillingPricingPolicy } from './entities/billing-pricing-policy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageSnapshot, Tenant, TenantTier, AuditLog, BillingPricingPolicy]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BillingController],
  providers: [BillingService, UsageSnapshotBatchService, AuditLogService],
})
export class BillingModule {}
