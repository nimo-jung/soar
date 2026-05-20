import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterIntegrityDto {
  @ApiProperty({ description: '점검 대상 파일 절대 경로 또는 컨테이너 내 경로' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  filePath: string;

  @ApiProperty({ description: '파일 식별 레이블 (화면 표시용)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileLabel: string;
}
