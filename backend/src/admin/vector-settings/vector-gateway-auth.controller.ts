import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VectorSettingsService } from './vector-settings.service';

@ApiTags('Internal - Vector Gateway Auth')
@Controller('internal/vector-http-auth')
export class VectorGatewayAuthController {
  constructor(private readonly vectorSettingsService: VectorSettingsService) {}

  @Get('validate')
  @ApiOperation({ summary: 'Gateway subrequest용 Vector HTTP 인증 검증' })
  async validate(
    @Headers('x-tenant-slug') tenantSlug: string | undefined,
    @Headers('x-vector-source-id') sourceId: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-vector-auth-token') authToken: string | undefined,
  ): Promise<{ ok: true }> {
    const allowed = await this.vectorSettingsService.validateGatewayHttpAuth(
      tenantSlug ?? '',
      sourceId ?? '',
      authorization,
      authToken,
    );

    if (!allowed) {
      throw new UnauthorizedException('vector gateway auth failed');
    }

    return { ok: true };
  }
}
