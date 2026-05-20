import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IntegrityController } from './integrity.controller';
import { IntegrityService } from './integrity.service';
import { IntegrityBaseline } from './entities/integrity-baseline.entity';
import { AuditLog } from '../../common/audit/entities/audit-log.entity';
import { AuditLogService } from '../../common/audit/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntegrityBaseline, AuditLog]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [IntegrityController],
  providers: [IntegrityService, AuditLogService],
})
export class IntegrityModule {}
