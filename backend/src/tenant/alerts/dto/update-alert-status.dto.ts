import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AlertStatus } from '../entities/alert.entity';

export class UpdateAlertStatusDto {
  @ApiProperty({ enum: AlertStatus, description: '처리 상태' })
  @IsEnum(AlertStatus)
  status: AlertStatus;
}
