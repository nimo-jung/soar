import { IsString, IsEmail, IsOptional, MinLength, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantTierCode } from '../entities/tenant-tier.entity';

export class CreateTenantDto {
  @ApiProperty({ description: '테넌트 슬러그 (영문 소문자 및 숫자, DB명 접미사)', example: 'acme-corp' })
  @IsString()
  @MinLength(3)
  slug: string;

  @ApiProperty({ description: '고객사명', example: 'Acme Corporation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '담당자 이메일', example: 'admin@acme.com' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({
    enum: TenantTierCode,
    description: '테넌트 등급 코드 (기본값: LITE)',
    default: TenantTierCode.LITE,
  })
  @IsEnum(TenantTierCode)
  @IsOptional()
  tierCode?: TenantTierCode;

  @ApiPropertyOptional({ description: '사용 기한(ISO-8601)', example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: '허용 IP 대역(CIDR 또는 콤마 구분 목록)', example: '10.0.0.0/24' })
  @IsString()
  @IsOptional()
  ipCidr?: string;
}
