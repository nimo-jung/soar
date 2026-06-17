import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

class ProxySearchDto {
  tenantId: string;
  collection: string;
  text: string;
  topK?: number;
}

@Controller('admin/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('proxy-search')
  async proxySearch(@Body() body: ProxySearchDto) {
    const { tenantId, collection, text, topK } = body;
    return this.ai.search(tenantId, collection, text, topK || 5);
  }
}
