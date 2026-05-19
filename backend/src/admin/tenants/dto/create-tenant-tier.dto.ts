import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TenantTierCode } from '../entities/tenant-tier.entity';

export class CreateTenantTierDto {
  @ApiProperty({ enum: TenantTierCode, description: '등급 코드' })
  @IsEnum(TenantTierCode)
  code: TenantTierCode;

  @ApiProperty({ description: '등급 표시명', example: 'Lite' })
  @IsString()
  name: string;

  @ApiProperty({ description: '하루 로그 저장 용량 한도(GB)', example: 1 })
  @IsInt()
  @Min(1)
  dailyLogQuotaGb: number;

  @ApiProperty({ description: '테넌트 사용자 수 한도', example: 1 })
  @IsInt()
  @Min(1)
  maxUsers: number;

  @ApiPropertyOptional({ description: '등급 설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '등급 활성 여부', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
