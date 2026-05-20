import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { TenantRole } from '../../../common/guards/roles.guard';

export class CreateTenantUserDto {
  @ApiProperty({ description: '사용자 이메일', example: 'analyst@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '초기 비밀번호', minLength: 8, example: 'StrongPass!234' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: '표시 이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ enum: TenantRole, description: '역할 (operator | analyst | auditor)' })
  @IsEnum(TenantRole)
  role: TenantRole;
}
