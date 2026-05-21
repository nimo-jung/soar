import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@tms.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepassword' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: '동시 세션 초과 시 기존 세션을 강제 종료하고 로그인할지 여부' })
  @IsOptional()
  @IsBoolean()
  forceLogoutExistingSessions?: boolean;
}
