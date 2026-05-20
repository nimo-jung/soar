import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer | null = null;
  private connectPromise: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async publish(topic: string, payload: Record<string, unknown>, key?: string): Promise<void> {
    await this.ensureConnected();

    const producer = this.getProducer();
    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(payload),
        },
      ],
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.producer) {
      return;
    }

    await this.producer.disconnect();
    this.producer = null;
    this.connectPromise = null;
  }

  private async ensureConnected(): Promise<void> {
    if (this.producer) {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.connect();
    }

    await this.connectPromise;
  }

  private async connect(): Promise<void> {
    const brokers = this.getBrokers();
    const kafka = new Kafka({
      clientId: this.configService.get<string>('KAFKA_CLIENT_ID', 'soar-backend'),
      brokers,
      logLevel: logLevel.NOTHING,
    });

    const producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    try {
      await producer.connect();
      this.producer = producer;
      this.logger.log(`Kafka producer connected (${brokers.join(',')})`);
    } catch (error) {
      this.connectPromise = null;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Kafka producer connection failed: ${message}`);
    }
  }

  private getBrokers(): string[] {
    const configured = this.configService.get<string>('KAFKA_BROKERS', 'localhost:19092');
    return configured
      .split(',')
      .map((broker) => broker.trim())
      .filter((broker) => broker.length > 0);
  }

  private getProducer(): Producer {
    if (!this.producer) {
      throw new Error('Kafka producer is not connected');
    }
    return this.producer;
  }
}