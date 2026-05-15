import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThreatIntelDto {
  @ApiProperty({ description: '피드 유형', example: 'IP' })
  @IsString()
  @IsIn(['IP', 'DOMAIN', 'HASH', 'URL'])
  feedType: string;

  @ApiProperty({ description: '위협 지표', example: '192.168.1.100' })
  @IsString()
  @IsNotEmpty()
  indicator: string;

  @ApiPropertyOptional({ description: '위협 수준', example: 'HIGH' })
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({ description: '위협 설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '출처' })
  @IsString()
  @IsOptional()
  source?: string;
}
