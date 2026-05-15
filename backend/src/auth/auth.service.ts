import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MasterUser } from '../admin/master-users/entities/master-user.entity';
import { Tenant } from '../admin/tenants/entities/tenant.entity';
import { TenantSettings } from '../admin/tenants/entities/tenant-settings.entity';
import { TenantConnectionService } from '../common/database/tenant-connection.service';
import { TenantUser } from '../tenant/users/entities/tenant-user.entity';
import { LoginDto } from './dto/login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(MasterUser)
    private readonly masterUserRepo: Repository<MasterUser>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantSettings)
    private readonly tenantSettingsRepo: Repository<TenantSettings>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly jwtService: JwtService,
  ) {}

  async loginAsMaster(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.masterUserRepo.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const payload = { sub: user.id, isMaster: true, role: 'master' };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async loginAsTenant(
    dto: TenantLoginDto,
  ): Promise<{ accessToken: string; brandingConfig: Record<string, string> | null }> {
    const tenant = await this.tenantRepo.findOne({
      where: { slug: dto.tenantSlug, status: 'ACTIVE' as any },
    });

    if (!tenant) {
      throw new UnauthorizedException('테넌트를 찾을 수 없거나 비활성 상태입니다.');
    }

    const conn = await this.tenantConnectionService.getConnection(
      tenant.slug.replace(/-/g, '_'),
    );
    const tenantUserRepo = conn.getRepository(TenantUser);

    const user = await tenantUserRepo.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const settings = await this.tenantSettingsRepo.findOne({
      where: { tenantId: tenant.id },
    });

    const payload = {
      sub: user.id,
      tenantId: tenant.slug.replace(/-/g, '_'),
      role: user.role,
      isMaster: false,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      brandingConfig: settings?.brandingConfig ?? null,
    };
  }
}
