import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { IntegrityBaseline, IntegrityStatus } from './entities/integrity-baseline.entity';
import { RegisterIntegrityDto } from './dto/register-integrity.dto';

// 기본 등록 파일 목록 (컨테이너 환경 기준)
const DEFAULT_FILES: Array<{ filePath: string; fileLabel: string }> = [
  { filePath: path.resolve(process.cwd(), '../.env'), fileLabel: '.env (환경 변수)' },
  { filePath: path.resolve(process.cwd(), '../infra/mariadb/init'), fileLabel: 'MariaDB init 디렉토리' },
  { filePath: path.resolve(process.cwd(), 'dist/main.js'), fileLabel: 'Backend 빌드 결과물 (main.js)' },
];

@Injectable()
export class IntegrityService implements OnModuleInit {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(
    @InjectRepository(IntegrityBaseline)
    private readonly baselineRepo: Repository<IntegrityBaseline>,
  ) {}

  async onModuleInit(): Promise<void> {
    // 기본 파일 목록이 없으면 자동 등록
    const count = await this.baselineRepo.count();
    if (count === 0) {
      for (const f of DEFAULT_FILES) {
        try {
          await this.baselineRepo.save(this.baselineRepo.create(f));
        } catch {
          // 중복 등록 무시
        }
      }
      this.logger.log('무결성 기준 파일 기본 목록 등록 완료');
    }
  }

  // ──────────────────────────────────────────────
  // SHA256 해시 계산
  // ──────────────────────────────────────────────
  private async computeHash(filePath: string): Promise<string | null> {
    try {
      const stat = await fs.stat(filePath);
      const hash = createHash('SHA256');

      if (stat.isDirectory()) {
        // 디렉토리는 내부 파일 목록+크기를 해시 입력으로 사용
        const entries = await fs.readdir(filePath);
        const sorted = entries.sort();
        for (const entry of sorted) {
          const full = path.join(filePath, entry);
          const entryStat = await fs.stat(full).catch(() => null);
          if (entryStat) {
            hash.update(`${entry}:${entryStat.size}:${entryStat.mtimeMs}`);
          }
        }
      } else {
        const content = await fs.readFile(filePath);
        hash.update(content);
      }

      return hash.digest('hex');
    } catch {
      return null; // 파일 없음 or 접근 불가
    }
  }

  // ──────────────────────────────────────────────
  // 전체 파일 점검
  // ──────────────────────────────────────────────
  async checkAll(): Promise<IntegrityBaseline[]> {
    const baselines = await this.baselineRepo.find({ order: { fileLabel: 'ASC' } });
    const now = new Date();

    for (const baseline of baselines) {
      const currentHash = await this.computeHash(baseline.filePath);
      baseline.currentHash = currentHash;
      baseline.lastCheckedAt = now;

      if (currentHash === null) {
        baseline.status = IntegrityStatus.MISSING;
      } else if (baseline.expectedHash === null) {
        baseline.status = IntegrityStatus.UNCHECKED;
      } else if (currentHash === baseline.expectedHash) {
        baseline.status = IntegrityStatus.OK;
      } else {
        baseline.status = IntegrityStatus.CHANGED;
      }
    }

    await this.baselineRepo.save(baselines);
    return baselines;
  }

  // ──────────────────────────────────────────────
  // 특정 파일 동기화 (현재 해시를 기준으로 설정)
  // ──────────────────────────────────────────────
  async sync(id: number): Promise<IntegrityBaseline> {
    const baseline = await this.baselineRepo.findOne({ where: { id } });
    if (!baseline) throw new NotFoundException(`integrity baseline id=${id} not found`);

    const currentHash = await this.computeHash(baseline.filePath);
    if (currentHash === null) {
      throw new Error(`파일에 접근할 수 없습니다: ${baseline.filePath}`);
    }

    baseline.expectedHash = currentHash;
    baseline.currentHash = currentHash;
    baseline.status = IntegrityStatus.OK;
    baseline.lastCheckedAt = new Date();
    baseline.lastSyncedAt = new Date();

    return this.baselineRepo.save(baseline);
  }

  // ──────────────────────────────────────────────
  // 파일 등록
  // ──────────────────────────────────────────────
  async register(dto: RegisterIntegrityDto): Promise<IntegrityBaseline> {
    const existing = await this.baselineRepo.findOne({ where: { filePath: dto.filePath } });
    if (existing) return existing;

    return this.baselineRepo.save(this.baselineRepo.create(dto));
  }

  // ──────────────────────────────────────────────
  // 파일 추적 삭제
  // ──────────────────────────────────────────────
  async remove(id: number): Promise<void> {
    const baseline = await this.baselineRepo.findOne({ where: { id } });
    if (!baseline) throw new NotFoundException(`integrity baseline id=${id} not found`);
    await this.baselineRepo.remove(baseline);
  }

  async findAll(): Promise<IntegrityBaseline[]> {
    return this.baselineRepo.find({ order: { fileLabel: 'ASC' } });
  }
}
