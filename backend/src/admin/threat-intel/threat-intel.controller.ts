import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ThreatIntelService } from './threat-intel.service';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';
import { MasterGuard } from '../../common/guards/master.guard';

@ApiTags('Admin - Threat Intel')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/threat-intel')
export class ThreatIntelController {
  constructor(private readonly threatIntelService: ThreatIntelService) {}

  @Post()
  @ApiOperation({ summary: '글로벌 TI 피드 등록 및 RedPanda 전파' })
  create(@Body() dto: CreateThreatIntelDto) {
    return this.threatIntelService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '활성 TI 피드 목록 조회' })
  findAll() {
    return this.threatIntelService.findAll();
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'TI 피드 비활성화' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.threatIntelService.deactivate(id);
  }
}
