import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: '테넌트 슬러그 (영문 소문자 및 숫자, DB명 접미사)', example: 'acme-corp' })
  @IsString()
  @MinLength(3)
  slug: string;

  @ApiProperty({ description: '고객사명', example: 'Acme Corporation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '담당자 이메일', example: 'admin@acme.com' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;
}
