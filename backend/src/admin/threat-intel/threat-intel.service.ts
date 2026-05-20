import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThreatIntelFeed, TiDispatchStatus } from './entities/threat-intel-feed.entity';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';

@Injectable()
export class ThreatIntelService {
  constructor(
    @InjectRepository(ThreatIntelFeed)
    private readonly feedRepo: Repository<ThreatIntelFeed>,
  ) {}

  async create(dto: CreateThreatIntelDto): Promise<ThreatIntelFeed> {
    const feed = this.feedRepo.create({ ...dto, dispatchStatus: TiDispatchStatus.PENDING, dispatchAttempts: 0 });
    const saved = await this.feedRepo.save(feed);
    // RedPanda 전파 시도 (Go 엔진 ti.global.updates 토픽)
    await this.dispatchFeed(saved.id);
    return this.feedRepo.findOneOrFail({ where: { id: saved.id } });
  }

  async findAll(): Promise<ThreatIntelFeed[]> {
    return this.feedRepo.find({ order: { createdAt: 'DESC' } });
  }

  async deactivate(id: number): Promise<void> {
    const feed = await this.feedRepo.findOne({ where: { id } });
    if (!feed) throw new NotFoundException(`TI feed id=${id} not found`);
    await this.feedRepo.update(id, { isActive: false });
  }

  async dispatchFeed(id: number): Promise<ThreatIntelFeed> {
    const feed = await this.feedRepo.findOne({ where: { id } });
    if (!feed) throw new NotFoundException(`TI feed id=${id} not found`);

    await this.feedRepo.update(id, {
      dispatchAttempts: (feed.dispatchAttempts ?? 0) + 1,
    });

    try {
      // RedPanda 전파 포인트 — 실제 Kafka 클라이언트 연동 시 여기에 구현
      // 현재는 mock 성공으로 처리; 프로덕션에서 KafkaProducerService로 교체
      await this.mockPublish(feed);

      await this.feedRepo.update(id, {
        dispatchStatus: TiDispatchStatus.DISPATCHED,
        dispatchedAt: new Date(),
        dispatchError: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.feedRepo.update(id, {
        dispatchStatus: TiDispatchStatus.FAILED,
        dispatchError: message,
      });
    }

    return this.feedRepo.findOneOrFail({ where: { id } });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async mockPublish(_feed: ThreatIntelFeed): Promise<void> {
    // TODO: 실제 RedPanda KafkaProducerService로 교체
    // await this.kafkaProducer.publish('ti.global.updates', JSON.stringify(feed));
  }
}
