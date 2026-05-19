import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTenantTierDto {
  @ApiPropertyOptional({ description: '등급 표시명' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '하루 로그 저장 용량 한도(GB)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  dailyLogQuotaGb?: number;

  @ApiPropertyOptional({ description: '테넌트 사용자 수 한도' })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsers?: number;

  @ApiPropertyOptional({ description: '등급 설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '등급 활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
