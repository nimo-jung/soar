import { Module } from '@nestjs/common';
import { TenantsModule } from './tenants/tenants.module';
import { ThreatIntelModule } from './threat-intel/threat-intel.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
  imports: [TenantsModule, ThreatIntelModule, AuditLogsModule],
  exports: [TenantsModule],
})
export class AdminModule {}
