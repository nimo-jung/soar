import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

/**
 * 인증 세션을 Redis에 저장·조회·삭제·연장한다.
 *
 * 키 패턴:
 *   session:{jti}                              — 세션 유효성 (EX TTL)
 *   sessions:master:{accountId}                — 마스터 동시 세션 Set
 *   sessions:tenant:{tenantSlug}:{accountId}   — 테넌트 동시 세션 Set
 *
 * - 로그인  → set() + addToSet()
 * - 요청 검증 → exists()
 * - 로그아웃 → del() + removeFromSet()
 * - 세션 연장 → extend()
 * - 동시 세션 카운트 → pruneAndCount()
 */
@Injectable()
export class SessionStoreService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(jti: string): string {
    return `session:${jti}`;
  }

  async set(jti: string, accountId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(jti), accountId, 'EX', ttlSeconds);
  }

  async exists(jti: string): Promise<boolean> {
    return (await this.redis.exists(this.key(jti))) === 1;
  }

  async del(jti: string): Promise<void> {
    await this.redis.del(this.key(jti));
  }

  async extend(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(this.key(jti), ttlSeconds);
  }

  /**
   * 여러 jti를 한 번에 확인한다. Redis PIPELINE으로 배치 처리.
   * @returns jti → 존재 여부 Map
   */
  async existsBatch(jtis: string[]): Promise<Map<string, boolean>> {
    if (jtis.length === 0) return new Map();

    const pipeline = this.redis.pipeline();
    for (const jti of jtis) {
      pipeline.exists(this.key(jti));
    }
    const results = await pipeline.exec();

    const map = new Map<string, boolean>();
    jtis.forEach((jti, idx) => {
      const result = results?.[idx];
      map.set(jti, result?.[1] === 1);
    });
    return map;
  }

  // ── 동시 세션 Set 관리 ─────────────────────────────────────────────────────

  /**
   * 계정의 동시 세션 Set에 jti를 추가한다.
   * setKey 예시: "sessions:master:42" / "sessions:tenant:acme:7"
   */
  async addToSet(setKey: string, jti: string): Promise<void> {
    await this.redis.sadd(setKey, jti);
  }

  /** 계정의 동시 세션 Set에서 jti를 제거한다. */
  async removeFromSet(setKey: string, jti: string): Promise<void> {
    await this.redis.srem(setKey, jti);
  }

  /**
   * Set 내 만료된 jti를 정리하고 현재 활성 세션 수를 반환한다.
   * - SMEMBERS → existsBatch → 만료된 jti SREM (pipeline)
   */
  async pruneAndCount(setKey: string): Promise<number> {
    const jtis = await this.redis.smembers(setKey);
    if (jtis.length === 0) return 0;

    const existsMap = await this.existsBatch(jtis);
    const expired = jtis.filter((jti) => !existsMap.get(jti));

    if (expired.length > 0) {
      const pipeline = this.redis.pipeline();
      for (const jti of expired) {
        pipeline.srem(setKey, jti);
      }
      await pipeline.exec();
    }

    return jtis.length - expired.length;
  }

  /**
   * 계정의 동시 세션 Set에 포함된 세션을 모두 종료한다.
   * @returns 종료 처리된 세션 수
   */
  async revokeAllFromSet(setKey: string): Promise<number> {
    const jtis = await this.redis.smembers(setKey);
    if (jtis.length === 0) {
      await this.redis.del(setKey);
      return 0;
    }

    const pipeline = this.redis.pipeline();
    for (const jti of jtis) {
      pipeline.del(this.key(jti));
    }
    pipeline.del(setKey);
    await pipeline.exec();

    return jtis.length;
  }
}
