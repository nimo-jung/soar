import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionService } from '../../common/database/tenant-connection.service';
import { TenantContext } from '../../common/context/tenant.context';
import { Alert, AlertStatus } from './entities/alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { AlertNotificationPolicy } from './entities/alert-notification-policy.entity';
import { AlertNotificationHistory } from './entities/alert-notification-history.entity';
import { UpdateAlertNotificationPolicyDto } from './dto/update-alert-notification-policy.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly tenantConn: TenantConnectionService) {}

  private async getRepos(tenantId: string) {
    const conn = await this.tenantConn.getConnection(tenantId);
    return {
      alertRepo: conn.getRepository(Alert),
      policyRepo: conn.getRepository(AlertNotificationPolicy),
      historyRepo: conn.getRepository(AlertNotificationHistory),
    };
  }

  async findAll(): Promise<Alert[]> {
    const tenantId = TenantContext.getTenantId();
    const { alertRepo } = await this.getRepos(tenantId);
    return alertRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateAlertDto): Promise<Alert> {
    const tenantId = TenantContext.getTenantId();
    const { alertRepo, historyRepo } = await this.getRepos(tenantId);

    const alert = new Alert();
    alert.title = dto.title;
    alert.description = dto.description ?? '';
    alert.severity = dto.severity;
    alert.status = AlertStatus.OPEN;
    alert.sourceIp = dto.sourceIp ?? '';
    alert.ruleId = dto.ruleId ?? '';
    alert.assignedTo = 0;

    const saved = await alertRepo.save(alert);

    const policy = await this.getOrCreatePolicyInternal(tenantId);
    await this.recordDeliveryHistory(saved.id, policy.channels, policy.recipients, historyRepo);

    return saved;
  }

  async updateStatus(id: number, dto: UpdateAlertStatusDto): Promise<Alert> {
    const tenantId = TenantContext.getTenantId();
    const { alertRepo } = await this.getRepos(tenantId);
    const alert = await alertRepo.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`alert id=${id} not found`);
    }

    alert.status = dto.status;
    return alertRepo.save(alert);
  }

  async getNotificationPolicy(): Promise<AlertNotificationPolicy> {
    const tenantId = TenantContext.getTenantId();
    return this.getOrCreatePolicyInternal(tenantId);
  }

  async updateNotificationPolicy(dto: UpdateAlertNotificationPolicyDto): Promise<AlertNotificationPolicy> {
    const tenantId = TenantContext.getTenantId();
    const { policyRepo } = await this.getRepos(tenantId);
    const policy = await this.getOrCreatePolicyInternal(tenantId);

    policy.channels = dto.channels;
    policy.recipients = dto.recipients;
    return policyRepo.save(policy);
  }

  async getNotificationHistory(limit = 100): Promise<AlertNotificationHistory[]> {
    const tenantId = TenantContext.getTenantId();
    const { historyRepo } = await this.getRepos(tenantId);
    const normalizedLimit = Math.min(Math.max(limit, 1), 500);
    return historyRepo.find({
      order: { sentAt: 'DESC' },
      take: normalizedLimit,
    });
  }

  private async getOrCreatePolicyInternal(tenantId: string): Promise<AlertNotificationPolicy> {
    const { policyRepo } = await this.getRepos(tenantId);
    const existing = await policyRepo.findOne({ where: { id: 1 } });
    if (existing) {
      return existing;
    }

    const created = policyRepo.create({
      id: 1,
      channels: ['EMAIL'],
      recipients: ['soc@example.com'],
    });
    return policyRepo.save(created);
  }

  private async recordDeliveryHistory(
    alertId: number,
    channels: string[],
    recipients: string[],
    historyRepo: Awaited<ReturnType<AlertsService['getRepos']>>['historyRepo'],
  ): Promise<void> {
    const rows: AlertNotificationHistory[] = [];

    for (const channel of channels) {
      for (const recipient of recipients) {
        rows.push(
          historyRepo.create({
            alertId,
            channel,
            recipient,
            deliveryStatus: 'SENT',
            errorMessage: null,
          }),
        );
      }
    }

    if (rows.length > 0) {
      await historyRepo.save(rows);
    }
  }
}
