import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class BootstrapTenantDto {
  @ApiProperty({ description: '고객사 코드', example: 'acme-corp' })
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;

  @ApiProperty({ description: '초대 토큰(1회성)', example: 'd9a8f2...' })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;

  @ApiProperty({ description: '최초 관리자 이메일', example: 'operator@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '최초 관리자 표시 이름', example: 'SOC Operator' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ description: '최초 관리자 비밀번호', minLength: 8, example: 'StrongPass!234' })
  @IsString()
  @MinLength(8)
  password: string;
}
