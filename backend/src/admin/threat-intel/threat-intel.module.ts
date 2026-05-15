import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ThreatIntelController } from './threat-intel.controller';
import { ThreatIntelService } from './threat-intel.service';
import { ThreatIntelFeed } from './entities/threat-intel-feed.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThreatIntelFeed]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ThreatIntelController],
  providers: [ThreatIntelService],
})
export class ThreatIntelModule {}
