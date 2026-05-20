import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { TenantContext } from '../../common/context/tenant.context';
import { TenantUser } from './entities/tenant-user.entity';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly tenantConn: TenantConnectionService) {}

  private async getRepo(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return conn.getRepository(TenantUser);
  }

  async findAll(): Promise<Array<Omit<TenantUser, 'passwordHash'>>> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    const rows = await repo.find({ order: { createdAt: 'DESC' } });
    return rows.map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  async create(dto: CreateTenantUserDto): Promise<Omit<TenantUser, 'passwordHash'>> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);

    const exists = await repo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (exists) {
      throw new ConflictException('이미 존재하는 사용자 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = repo.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      displayName: dto.displayName,
      role: dto.role,
      isActive: true,
    });

    const saved = await repo.save(user);
    const { passwordHash: _passwordHash, ...sanitized } = saved;
    return sanitized;
  }

  async update(id: number, dto: UpdateTenantUserDto): Promise<Omit<TenantUser, 'passwordHash'>> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    const user = await repo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`tenant user id=${id} not found`);
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }

    if (dto.role !== undefined) {
      user.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    if (dto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updated = await repo.save(user);
    const { passwordHash: _passwordHash, ...sanitized } = updated;
    return sanitized;
  }

  async deactivate(id: number): Promise<void> {
    const tenantId = TenantContext.getTenantId();
    const repo = await this.getRepo(tenantId);
    const user = await repo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`tenant user id=${id} not found`);
    }

    if (!user.isActive) {
      throw new BadRequestException('이미 비활성화된 사용자입니다.');
    }

    await repo.update(id, { isActive: false });
  }
}
