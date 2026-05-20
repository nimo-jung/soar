import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataIsolationController } from './data-isolation.controller';
import { DataIsolationService } from './data-isolation.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, AuditLog]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DataIsolationController],
  providers: [DataIsolationService],
})
export class DataIsolationModule {}
