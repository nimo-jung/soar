import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TenantLoginDto {
  @ApiProperty({ example: 'operator@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepassword' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: '테넌트 슬러그', example: 'acme-corp' })
  @IsString()
  tenantSlug: string;
}
