import { IsEnum, IsOptional, IsEmail, IsDateString, IsString, IsInt, Min, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../entities/tenant.entity';

const IP_OR_CIDR_LIST_REGEX = /^\s*(?:\d{1,3}(?:\.\d{1,3}){3}(?:\/(?:3[0-2]|[12]?\d))?)(?:\s*,\s*\d{1,3}(?:\.\d{1,3}){3}(?:\/(?:3[0-2]|[12]?\d))?)*\s*$/;

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

  @ApiPropertyOptional({ description: '테넌트 등급 ID' })
  @IsInt()
  @Min(1)
  @IsOptional()
  tierId?: number;

  @ApiPropertyOptional({ description: '사용 기한(ISO-8601)' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: '로그 수집 대상 IP 대역(단일 IP 또는 CIDR, 콤마 구분 목록)' })
  @IsString()
  @IsOptional()
  @Matches(IP_OR_CIDR_LIST_REGEX, {
    message: 'ipCidr는 단일 IP 또는 CIDR 형식이며, 다중 입력은 콤마(,)로 구분해야 합니다.',
  })
  ipCidr?: string;
}
