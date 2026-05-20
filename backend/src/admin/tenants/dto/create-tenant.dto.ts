import { IsString, IsEmail, IsOptional, MinLength, IsDateString, IsInt, Min, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const IP_OR_CIDR_LIST_REGEX = /^\s*(?:\d{1,3}(?:\.\d{1,3}){3}(?:\/(?:3[0-2]|[12]?\d))?)(?:\s*,\s*\d{1,3}(?:\.\d{1,3}){3}(?:\/(?:3[0-2]|[12]?\d))?)*\s*$/;

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
    description: '테넌트 등급 ID (미지정 시 첫 활성 등급)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  tierId?: number;

  @ApiPropertyOptional({ description: '초당 허용 이벤트 수(EPS) 한도', example: 1000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  epsLimit?: number;

  @ApiPropertyOptional({ description: '스토리지 허용 한도(GB). 미지정 시 등급 기본값 적용', example: 100 })
  @IsInt()
  @Min(0)
  @IsOptional()
  storageQuotaGb?: number;

  @ApiPropertyOptional({ description: '로그 보관 주기(일)', example: 90 })
  @IsInt()
  @Min(0)
  @IsOptional()
  retentionDays?: number;

  @ApiProperty({ description: '사용 기한(ISO-8601)', example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  expiresAt: string;

  @ApiProperty({ description: '로그 수집 대상 IP 대역(단일 IP 또는 CIDR, 콤마 구분 목록)', example: '10.0.0.10,10.0.1.0/24' })
  @IsString()
  @IsNotEmpty()
  @Matches(IP_OR_CIDR_LIST_REGEX, {
    message: 'ipCidr는 단일 IP 또는 CIDR 형식이며, 다중 입력은 콤마(,)로 구분해야 합니다.',
  })
  ipCidr: string;
}
