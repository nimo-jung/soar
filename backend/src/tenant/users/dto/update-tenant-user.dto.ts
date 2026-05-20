import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TenantRole } from '../../../common/guards/roles.guard';

export class UpdateTenantUserDto {
  @ApiPropertyOptional({ description: '표시 이름' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ enum: TenantRole, description: '역할 (operator | analyst | auditor)' })
  @IsEnum(TenantRole)
  @IsOptional()
  role?: TenantRole;

  @ApiPropertyOptional({ description: '비밀번호 변경', minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
