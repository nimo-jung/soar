import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { MasterGuard } from '../../common/guards/master.guard';

@ApiTags('Admin - Tenants')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: '테넌트 생성 및 전용 DB 프로비저닝' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '전체 테넌트 목록 조회' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '테넌트 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '테넌트 정보 수정 (상태 변경 포함)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '테넌트 소프트 삭제 (상태 → DELETED)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.softDelete(id);
  }

  @Get(':id/settings')
  @ApiOperation({ summary: '테넌트 설정 조회 (EPS·스토리지·보관 주기)' })
  getSettings(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.getSettings(id);
  }
}
