import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import {
  MASTER_USER_PASSWORD_POLICY_REGEX,
  MASTER_USER_PASSWORD_POLICY_MESSAGE,
} from '../password-policy';

export class CreateMasterUserDto {
  @ApiProperty({ description: '로그인 이메일', example: 'secops-admin@tms.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '초기 비밀번호 (K-보안 권고 조합 규칙)', example: 'ChangeMe1234!' })
  @IsString()
  @Matches(MASTER_USER_PASSWORD_POLICY_REGEX, { message: MASTER_USER_PASSWORD_POLICY_MESSAGE })
  password: string;

  @ApiPropertyOptional({ description: '계정 활성 여부', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
