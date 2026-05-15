import { Module } from '@nestjs/common';
import { TenantsModule } from './tenants/tenants.module';
import { ThreatIntelModule } from './threat-intel/threat-intel.module';

@Module({
  imports: [TenantsModule, ThreatIntelModule],
  exports: [TenantsModule],
})
export class AdminModule {}
