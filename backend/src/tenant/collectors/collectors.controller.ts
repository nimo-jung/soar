import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantRole } from '../../common/guards/roles.guard';

@ApiTags('Tenant - Collectors')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/collectors')
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: 'Collector 등록 및 API Key 발급 (plain key 단 1회 반환)' })
  create(@Body() dto: CreateCollectorDto) {
    return this.collectorsService.create(dto);
  }

  @Get()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST)
  @ApiOperation({ summary: 'Collector 목록 조회' })
  findAll() {
    return this.collectorsService.findAll();
  }

  @Patch(':id/deactivate')
  @Roles(TenantRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Collector 비활성화' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.collectorsService.deactivate(id);
  }
}
