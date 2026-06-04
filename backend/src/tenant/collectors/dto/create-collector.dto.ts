import { IsString, IsNotEmpty, IsOptional, IsIP, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCollectorDto {
  @ApiProperty({ description: 'Collector 이름', example: 'Firewall-01' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '장비 고유 코드(전역 유일, 미입력 시 name 사용)', example: 'PA-DC1-EDGE-001' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9._:-]{3,128}$/)
  deviceCode?: string;

  @ApiPropertyOptional({ description: '장비 고정 Source IP (선택)', example: '10.10.10.15' })
  @IsOptional()
  @IsIP(4)
  sourceIp?: string;
}
