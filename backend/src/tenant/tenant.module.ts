import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CollectorsController } from './collectors/collectors.controller';
import { CollectorsService } from './collectors/collectors.service';
import { IpWhitelistController } from './ip-whitelist/ip-whitelist.controller';
import { IpWhitelistService } from './ip-whitelist/ip-whitelist.service';
import { PlaybooksController } from './playbooks/playbooks.controller';
import { PlaybooksService } from './playbooks/playbooks.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CollectorsController, IpWhitelistController, PlaybooksController],
  providers: [CollectorsService, IpWhitelistService, PlaybooksService],
})
export class TenantModule {}
