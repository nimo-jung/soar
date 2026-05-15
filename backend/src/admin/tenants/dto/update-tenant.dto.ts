import { IsEnum, IsOptional, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../entities/tenant.entity';

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
}
