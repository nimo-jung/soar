import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TenantLoginDto {
  @ApiProperty({ example: 'operator@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepassword' })
  @IsString()
  password: string;

  @ApiProperty({ description: '테넌트 슬러그 (단일 테넌트 모드에서는 생략 가능)', example: 'acme-corp', required: false })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
