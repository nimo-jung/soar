import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThreatIntelFeed, TiDispatchStatus } from './entities/threat-intel-feed.entity';
import { CreateThreatIntelDto } from './dto/create-threat-intel.dto';
import { KafkaProducerService } from '../../common/messaging/kafka-producer.service';

@Injectable()
export class ThreatIntelService {
  private readonly topic: string;

  constructor(
    @InjectRepository(ThreatIntelFeed)
    private readonly feedRepo: Repository<ThreatIntelFeed>,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly configService: ConfigService,
  ) {
    this.topic = this.configService.get<string>('TI_GLOBAL_TOPIC', 'ti.global.updates');
  }

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
      await this.kafkaProducerService.publish(
        this.topic,
        {
          id: feed.id,
          feedType: feed.feedType,
          indicator: feed.indicator,
          severity: feed.severity,
          description: feed.description,
          source: feed.source,
          isActive: feed.isActive,
          expiresAt: feed.expiresAt,
          createdAt: feed.createdAt,
          updatedAt: feed.updatedAt,
        },
        String(feed.id),
      );

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
}
