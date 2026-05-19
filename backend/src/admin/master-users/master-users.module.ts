import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { MasterUsersController } from './master-users.controller';
import { MasterUsersService } from './master-users.service';
import { MasterUser } from './entities/master-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MasterUser, AuditLog]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MasterUsersController],
  providers: [MasterUsersService, AuditLogService],
})
export class MasterUsersModule {}
