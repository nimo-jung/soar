import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MasterUser } from '../admin/master-users/entities/master-user.entity';
import { Tenant } from '../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../admin/tenants/entities/tenant-settings.entity';
import { AuditLog } from '../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../common/audit/audit-log.service';
import { MasterAuthSettings } from './entities/master-auth-settings.entity';
import { AuthUserSecurityState } from './entities/auth-user-security-state.entity';
import { License } from '../admin/product-info/entities/license.entity';
import { ProductInfoService } from '../admin/product-info/product-info.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MasterUser,
      Tenant,
      TenantSettings,
      AuditLog,
      MasterAuthSettings,
      AuthUserSecurityState,
      License,
    ]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN', '1d')) as any },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuditLogService, ProductInfoService],
})
export class AuthModule {}
