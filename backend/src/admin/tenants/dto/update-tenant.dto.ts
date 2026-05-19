import { IsEnum, IsOptional, IsEmail, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../entities/tenant.entity';
import { TenantTierCode } from '../entities/tenant-tier.entity';

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: '고객사명' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: TenantStatus, description: '테넌트 상태' })
  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @ApiPropertyOptional({ description: '담당자 이메일' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ enum: TenantTierCode, description: '테넌트 등급 코드' })
  @IsEnum(TenantTierCode)
  @IsOptional()
  tierCode?: TenantTierCode;

  @ApiPropertyOptional({ description: '사용 기한(ISO-8601)' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: '허용 IP 대역(CIDR 또는 콤마 구분 목록)' })
  @IsString()
  @IsOptional()
  ipCidr?: string;
}
