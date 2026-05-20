import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { CreateMasterUserDto } from './dto/create-master-user.dto';
import { UpdateMasterUserDto } from './dto/update-master-user.dto';
import { MasterUser, MasterUserStatus } from './entities/master-user.entity';
import { getMasterUserPasswordValidationError } from './password-policy';

const MAX_MASTER_USERS = 10;
const PASSWORD_HISTORY_LIMIT = 5;

@Injectable()
export class MasterUsersService {
  constructor(
    @InjectRepository(MasterUser)
    private readonly masterUserRepo: Repository<MasterUser>,
  ) {}

  async findAll(): Promise<MasterUser[]> {
    return this.masterUserRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<MasterUser> {
    const user = await this.masterUserRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`마스터 관리자 ID ${id}를 찾을 수 없습니다.`);
    }
    return user;
  }

  private async ensureEmailIsUnique(email: string, excludeId?: number): Promise<void> {
    const duplicate = await this.masterUserRepo.findOne({
      where: excludeId ? { email, id: Not(excludeId) } : { email },
    });

    if (duplicate) {
      throw new ConflictException(`이메일 '${email}'은(는) 이미 사용 중입니다.`);
    }
  }

  private async ensureActiveQuota(): Promise<void> {
    const activeCount = await this.masterUserRepo.count({ where: { status: MasterUserStatus.ACTIVE } });
    if (activeCount >= MAX_MASTER_USERS) {
      throw new ConflictException(`마스터 관리자 계정은 최대 ${MAX_MASTER_USERS}명까지 등록할 수 있습니다.`);
    }
  }

  private async ensurePasswordNotReused(user: MasterUser, plainPassword: string): Promise<void> {
    const currentMatched = await bcrypt.compare(plainPassword, user.passwordHash);
    if (currentMatched) {
      throw new BadRequestException('현재 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.');
    }

    const history = (user.passwordHistory ?? []).slice(0, PASSWORD_HISTORY_LIMIT);
    for (const previousHash of history) {
      const matched = await bcrypt.compare(plainPassword, previousHash);
      if (matched) {
        throw new BadRequestException('최근 사용한 비밀번호는 재사용할 수 없습니다.');
      }
    }
  }

  private buildNextPasswordHistory(user: MasterUser): string[] {
    const history = [user.passwordHash, ...(user.passwordHistory ?? [])];
    return history.slice(0, PASSWORD_HISTORY_LIMIT);
  }

  async create(dto: CreateMasterUserDto): Promise<MasterUser> {
    await this.ensureEmailIsUnique(dto.email);
    await this.ensureActiveQuota();

    const passwordError = getMasterUserPasswordValidationError(dto.password, dto.email);
    if (passwordError) {
      throw new BadRequestException(passwordError);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const entity = this.masterUserRepo.create({
      email: dto.email,
      passwordHash,
      passwordHistory: [],
      isActive: dto.isActive ?? true,
      status: MasterUserStatus.ACTIVE,
      deletedAt: null,
    });

    return this.masterUserRepo.save(entity);
  }

  async update(id: number, dto: UpdateMasterUserDto): Promise<MasterUser> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      await this.ensureEmailIsUnique(dto.email, id);
      user.email = dto.email;
    }

    if (dto.password) {
      const passwordError = getMasterUserPasswordValidationError(dto.password, dto.email ?? user.email);
      if (passwordError) {
        throw new BadRequestException(passwordError);
      }

      await this.ensurePasswordNotReused(user, dto.password);

      const nextHistory = this.buildNextPasswordHistory(user);
      user.passwordHistory = nextHistory;

      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    return this.masterUserRepo.save(user);
  }

  async softDelete(id: number): Promise<MasterUser> {
    const user = await this.findOne(id);
    user.status = MasterUserStatus.DELETED;
    user.deletedAt = new Date();
    user.isActive = false;
    return this.masterUserRepo.save(user);
  }

  async restore(id: number): Promise<MasterUser> {
    const user = await this.findOne(id);
    if (user.status === MasterUserStatus.ACTIVE) {
      return user;
    }

    await this.ensureActiveQuota();

    user.status = MasterUserStatus.ACTIVE;
    user.deletedAt = null;
    user.isActive = true;
    return this.masterUserRepo.save(user);
  }
}
