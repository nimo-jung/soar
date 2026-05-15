import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThreatIntelFeed } from './entities/threat-intel-feed.entity';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';

@Injectable()
export class ThreatIntelService {
  constructor(
    @InjectRepository(ThreatIntelFeed)
    private readonly feedRepo: Repository<ThreatIntelFeed>,
  ) {}

  async create(dto: CreateThreatIntelDto): Promise<ThreatIntelFeed> {
    const feed = this.feedRepo.create(dto);
    const saved = await this.feedRepo.save(feed);
    // RedPanda 전파: ti.global.updates 토픽 발행 (Go 엔진이 구독)
    // 실제 구현은 go-engine/publisher가 담당하므로 여기서는 이벤트 훅 포인트
    return saved;
  }

  async findAll(): Promise<ThreatIntelFeed[]> {
    return this.feedRepo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  async deactivate(id: number): Promise<void> {
    await this.feedRepo.update(id, { isActive: false });
  }
}
