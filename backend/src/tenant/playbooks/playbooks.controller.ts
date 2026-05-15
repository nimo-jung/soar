import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlaybooksService } from './playbooks.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreatePlaybookDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '워크플로우 정의 JSON' })
  definition: Record<string, unknown>;
}

@ApiTags('Tenant - Playbooks')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/playbooks')
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Get()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST, TenantRole.AUDITOR)
  @ApiOperation({ summary: '플레이북 목록 조회' })
  findAll() {
    return this.playbooksService.findAll();
  }

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: '플레이북 생성' })
  create(
    @Body() dto: CreatePlaybookDto,
    @CurrentUser() user: { sub: number },
  ) {
    return this.playbooksService.create(dto.name, dto.definition, user.sub, dto.description);
  }

  @Post(':id/execute')
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST)
  @ApiOperation({ summary: '플레이북 즉시 실행 (정의 동적 로드)' })
  execute(@Param('id', ParseIntPipe) id: number) {
    return this.playbooksService.execute(id);
  }
}
