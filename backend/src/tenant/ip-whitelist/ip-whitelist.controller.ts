import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IpWhitelistService } from './ip-whitelist.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard, TenantRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateIpWhitelistDto {
  @ApiProperty({ example: '192.168.1.0/24' })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

@ApiTags('Tenant - IP Whitelist')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/ip-whitelist')
export class IpWhitelistController {
  constructor(private readonly ipWhitelistService: IpWhitelistService) {}

  @Get()
  @Roles(TenantRole.OPERATOR, TenantRole.ANALYST, TenantRole.AUDITOR)
  @ApiOperation({ summary: 'IP 화이트리스트 조회' })
  findAll() {
    return this.ipWhitelistService.findAll();
  }

  @Post()
  @Roles(TenantRole.OPERATOR)
  @ApiOperation({ summary: 'IP 화이트리스트 항목 추가' })
  create(@Body() dto: CreateIpWhitelistDto) {
    return this.ipWhitelistService.create(dto.ipAddress, dto.description);
  }

  @Delete(':id')
  @Roles(TenantRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'IP 화이트리스트 항목 비활성화' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ipWhitelistService.remove(id);
  }
}
