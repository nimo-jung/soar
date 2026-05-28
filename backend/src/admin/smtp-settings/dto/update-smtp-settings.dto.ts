import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SMTP_MODE } from '../smtp-settings.constants';

export class UpdateSmtpSettingsDto {
  @ApiPropertyOptional({ description: 'SMTP 모드 (local/external)', enum: [SMTP_MODE.local, SMTP_MODE.external], default: SMTP_MODE.local })
  @IsIn([SMTP_MODE.local, SMTP_MODE.external])
  @IsOptional()
  smtpMode?: string;

  @ApiPropertyOptional({ description: 'SMTP 서버 호스트', example: 'smtp.example.com' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  smtpHost?: string;

  @ApiPropertyOptional({ description: 'SMTP 서버 포트', example: 587, minimum: 1, maximum: 65535 })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  smtpPort?: number;

  @ApiPropertyOptional({ description: 'SMTP TLS(implicit SSL) 사용 여부', default: false })
  @IsBoolean()
  @IsOptional()
  smtpSecure?: boolean;

  @ApiPropertyOptional({ description: 'SMTP 인증 사용자', example: 'smtp_user' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  smtpUser?: string;

  @ApiPropertyOptional({ description: 'SMTP 인증 비밀번호', example: 'smtp_password' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  smtpPass?: string;

  @ApiPropertyOptional({ description: '저장된 SMTP 비밀번호 삭제 여부', default: false })
  @IsBoolean()
  @IsOptional()
  clearSmtpPass?: boolean;

  @ApiPropertyOptional({ description: '메일 발신자 주소', example: 'no-reply@example.com' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  smtpFrom?: string;

  @ApiPropertyOptional({ description: '테넌트 토큰 등록 링크', example: 'https://admin.example.com/login' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  tenantBootstrapUrl?: string;
}
