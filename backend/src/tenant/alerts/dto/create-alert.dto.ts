import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AlertSeverity } from '../entities/alert.entity';

export class CreateAlertDto {
  @ApiProperty({ description: '알림 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '알림 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AlertSeverity, description: '위험도' })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiPropertyOptional({ description: '출발지 IP' })
  @IsOptional()
  @IsString()
  sourceIp?: string;

  @ApiPropertyOptional({ description: '룰 ID' })
  @IsOptional()
  @IsString()
  ruleId?: string;
}
