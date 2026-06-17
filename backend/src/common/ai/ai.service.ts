import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PYTHON_AI_URL || 'http://python-ai:8000';
  }

  async search(tenantId: string, collection: string, text: string, topK = 5) {
    const url = `${this.baseUrl}/search`;
    try {
      const apiKey = process.env.PYTHON_AI_API_KEY;
      const headers: any = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;

      const resp = await axios.post(url, { tenant_id: tenantId, collection, text, top_k: topK }, { headers, timeout: 5000 });
      return resp.data;
    } catch (err) {
      this.logger.error('AI search failed', err as any);
      throw err;
    }
  }
}
