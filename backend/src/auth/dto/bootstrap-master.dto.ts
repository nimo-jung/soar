import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';
import {
  MASTER_USER_PASSWORD_POLICY_MESSAGE,
  MASTER_USER_PASSWORD_POLICY_REGEX,
} from '../../admin/master-users/password-policy';

export class BootstrapMasterDto {
  @ApiProperty({ example: 'admin@tms.io', description: '최초 마스터 관리자 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'ChangeMe1234!',
    description: '최초 마스터 관리자 비밀번호 (KISA/CC 권고 조합 규칙)',
  })
  @IsString()
  @Matches(MASTER_USER_PASSWORD_POLICY_REGEX, { message: MASTER_USER_PASSWORD_POLICY_MESSAGE })
  password: string;
}
