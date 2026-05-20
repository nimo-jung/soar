import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsString } from 'class-validator';

const CHANNELS = ['EMAIL', 'SLACK', 'SMS'] as const;

export class UpdateAlertNotificationPolicyDto {
  @ApiProperty({ type: [String], example: ['EMAIL', 'SLACK'], description: '활성 알림 채널' })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(CHANNELS, { each: true })
  channels: string[];

  @ApiProperty({ type: [String], example: ['soc@acme.com', '#soc-alerts'], description: '수신자 목록' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recipients: string[];
}
