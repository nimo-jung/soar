import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MasterGuard } from '../../common/guards/master.guard';
import { ProductInfoService } from './product-info.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditActorType } from '../../common/audit/entities/audit-log.entity';

@ApiTags('Admin - Product Info')
@ApiBearerAuth()
@UseGuards(MasterGuard)
@Controller('admin/product-info')
export class ProductInfoController {
  constructor(
    private readonly productInfoService: ProductInfoService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private buildAuditContext(user: CurrentUserPayload, req: Request) {
    return {
      actorType: user.isMaster ? AuditActorType.MASTER : AuditActorType.TENANT,
      actorId: user.sub,
      actorEmail: user.email ?? null,
      tenantSlug: user.tenantId ?? null,
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    };
  }

  @Get()
  @ApiOperation({ summary: '제품 정보 및 현재 라이선스 정보 조회' })
  getProductInfo() {
    return this.productInfoService.getProductInfoView();
  }

  @Post('license/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '라이선스 파일 업로드 및 라이선스 정보 갱신' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1024 * 1024 } }))
  async uploadLicense(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('업로드된 라이선스 파일이 없습니다.');
    }

    const before = await this.productInfoService.getCurrentLicense();
    const after = await this.productInfoService.updateLicenseFromFile(file.buffer);

    await this.auditLogService.record({
      ...this.buildAuditContext(user, req),
      action: 'PRODUCT_LICENSE_UPDATE',
      resourceType: 'LICENSE',
      resourceId: String(after.id),
      message: '라이선스 파일 업로드로 라이선스 정보 갱신',
      metadata: {
        fileName: file.originalname,
        before: before
          ? {
              id: before.id,
              expiresAt: before.expiresAt,
              nicMacAddress: before.nicMacAddress,
            }
          : null,
        after: {
          id: after.id,
          expiresAt: after.expiresAt,
          nicMacAddress: after.nicMacAddress,
        },
      },
    });

    return { license: after };
  }
}
