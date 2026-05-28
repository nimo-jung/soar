import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetTenantPasswordDto {
  @ApiProperty({ description: '고객사 코드', example: 'acme-corp' })
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;

  @ApiProperty({ description: '재설정 토큰(1회성)', example: '4cf2bd...' })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ description: '재설정 대상 이메일', example: 'operator@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '새 비밀번호', minLength: 8, example: 'StrongPass!234' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
