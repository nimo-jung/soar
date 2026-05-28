import React, { useEffect, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { Dialog } from 'primereact/dialog';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Checkbox } from 'primereact/checkbox';
import { SelectButton } from 'primereact/selectbutton';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';
import { formatDateTimeSeconds } from '../../utils/date';
import type { AdminAuthSettings } from '../../types/auth-policy';
import ResultDialog from '../../components/ResultDialog';
import ActionConfirmDialog from '../../components/ActionConfirmDialog';

type DatabaseActionMode = 'recover' | 'reset';

interface TenantTier {
  id: number;
  code: string;
  name: string;
  dailyLogQuotaGb: number;
  maxUsers: number;
  description: string | null;
  isActive: boolean;
}

interface TenantQuota {
  tenantId: number;
  epsLimit: number;
  storageQuotaGb: number;
  retentionDays: number;
  updatedAt: string;
}

interface Tenant {
  id: number;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  contactEmail: string;
  expiresAt: string | null;
  ipCidr: string | null;
  tierId: number;
  tier?: TenantTier;
  quota?: TenantQuota;
  createdAt: string;
}

interface TenantBootstrapIssueResponse {
  tenantId: number;
  tenantSlug: string;
  email: string | null;
  token: string;
  registrationUrl: string | null;
  expiresAt: string;
  deliveredToEmail: boolean;
  mailDeliveryError: string | null;
}

interface TenantPasswordResetIssueResponse {
  tenantId: number;
  tenantSlug: string;
  email: string;
  token: string;
  expiresAt: string;
  deliveredToEmail: boolean;
  mailDeliveryError: string | null;
}

interface TenantBootstrapHistoryItem {
  id: number;
  email: string | null;
  expiresAt: string;
  usedAt: string | null;
  issuedByMasterUserId: number | null;
  createdAt: string;
}

interface TenantBootstrapHistoryResponse {
  items: TenantBootstrapHistoryItem[];
  page: number;
  limit: number;
  total: number;
}

interface TenantDatabaseStatus {
  tenantId: number;
  tenantSlug: string;
  exists: boolean;
  missingTables: string[];
  isReady: boolean;
}

type BootstrapHistoryVisibleField =
  | 'createdAt'
  | 'status'
  | 'email'
  | 'expiresAt'
  | 'usedAt'
  | 'issuedByMasterUserId';

type BootstrapHistoryStatusFilter = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'USED';

type TenantFormErrors = {
  slug?: string;
  name?: string;
  contactEmail?: string;
  tierId?: string;
  epsLimit?: string;
  storageQuotaGb?: string;
  retentionDays?: string;
  expiresAt?: string;
  ipCidr?: string;
};

type TenantVisibleField =
  | 'id'
  | 'slug'
  | 'name'
  | 'status'
  | 'tier'
  | 'expiresAt'
  | 'ipCidr'
  | 'contactEmail'
  | 'createdAt';

const tenantFieldOrder: TenantVisibleField[] = [
  'id',
  'slug',
  'name',
  'status',
  'tier',
  'expiresAt',
  'ipCidr',
  'contactEmail',
  'createdAt',
];

const bootstrapHistoryFieldOrder: BootstrapHistoryVisibleField[] = [
  'createdAt',
  'status',
  'email',
  'expiresAt',
  'usedAt',
  'issuedByMasterUserId',
];

const statusSeverity = (status: string) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'warning';
  return 'danger';
};

const bootstrapTokenStatus = (item: TenantBootstrapHistoryItem): 'ACTIVE' | 'EXPIRED' | 'USED' => {
  if (item.usedAt) {
    return 'USED';
  }
  return new Date(item.expiresAt).getTime() < Date.now() ? 'EXPIRED' : 'ACTIVE';
};

const bootstrapTokenStatusSeverity = (status: 'ACTIVE' | 'EXPIRED' | 'USED') => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'USED') return 'info';
  return 'danger';
};

const statusLabelKey = (status: Tenant['status']) => {
  if (status === 'ACTIVE') return 'common.active';
  if (status === 'SUSPENDED') return 'common.suspend';
  return 'tenants.filters.deleted';
};

const isValidTenantSlug = (value: string) => /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(value);

const getApiErrorStatusAndMessage = (error: unknown): { status?: number; message?: string } => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const rawMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;

  if (typeof rawMessage === 'string') {
    return { status, message: rawMessage };
  }

  if (Array.isArray(rawMessage)) {
    const joined = rawMessage.filter((item): item is string => typeof item === 'string').join(', ');
    return { status, message: joined || undefined };
  }

  return { status };
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidIpv4Cidr = (value: string) => {
  const match = value.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!match) return false;

  const octets = match[1].split('.').map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) return false;

  const prefix = Number(match[2]);
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
};

const isValidIpv4 = (value: string) => {
  const match = value.match(/^(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (!match) return false;

  const octets = match[1].split('.').map((part) => Number(part));
  return !octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255);
};

const normalizeIpCidrList = (value: string): string[] | null => {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (items.length === 0) {
    return null;
  }

  const allValid = items.every((item) => isValidIpv4(item) || isValidIpv4Cidr(item));
  if (!allValid) {
    return null;
  }

  return items;
};

const containsAllIpWildcard = (items: string[]): boolean => items.includes('0.0.0.0');

const getDefaultExpiresAt = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
};

const formatTierLimit = (value: number, unit: string, unlimitedLabel: string): string => {
  if (value === 0) {
    return unlimitedLabel;
  }

  return `${value}${unit}`;
};

const isUnlimitedTier = (tier: TenantTier | null): boolean => {
  if (!tier) {
    return false;
  }

  return tier.dailyLogQuotaGb === 0 && tier.maxUsers === 0;
};

const isSystemTenant = (tenant: Tenant): boolean => tenant.slug.trim().toLowerCase() === 'system';

const DEFAULT_EPS_LIMIT = 1000;
const DEFAULT_STORAGE_QUOTA_GB = 100;
const DEFAULT_RETENTION_DAYS = 90;
const BOOTSTRAP_TOKEN_MIN_EXPIRES_MINUTES = 10;
const BOOTSTRAP_TOKEN_MAX_EXPIRES_MINUTES = 2880;
const PASSWORD_RESET_TOKEN_MIN_EXPIRES_MINUTES = 5;
const PASSWORD_RESET_TOKEN_MAX_EXPIRES_MINUTES = 1440;

const TenantsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const rowMenusRef = React.useRef<Record<number, Menu | null>>({});
  const fieldPanelRef = React.useRef<OverlayPanel | null>(null);
  const bootstrapHistoryFieldPanelRef = React.useRef<OverlayPanel | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tiers, setTiers] = useState<TenantTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTenantDialog, setShowTenantDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Tenant['status']>('ALL');
  const [visibleFields, setVisibleFields] = useState<TenantVisibleField[]>(tenantFieldOrder);
  const [formErrors, setFormErrors] = useState<TenantFormErrors>({});
  const [showBootstrapIssueDialog, setShowBootstrapIssueDialog] = useState(false);
  const [issuingBootstrapToken, setIssuingBootstrapToken] = useState(false);
  const [bootstrapIssueTenant, setBootstrapIssueTenant] = useState<Tenant | null>(null);
  const [bootstrapIssueEmail, setBootstrapIssueEmail] = useState('');
  const [bootstrapIssueExpiresMinutes, setBootstrapIssueExpiresMinutes] = useState(60);
  const [showBootstrapIssueValidation, setShowBootstrapIssueValidation] = useState(false);
  const [issuedBootstrapToken, setIssuedBootstrapToken] = useState<TenantBootstrapIssueResponse | null>(null);
  const [showPasswordResetIssueDialog, setShowPasswordResetIssueDialog] = useState(false);
  const [issuingPasswordResetToken, setIssuingPasswordResetToken] = useState(false);
  const [passwordResetIssueTenant, setPasswordResetIssueTenant] = useState<Tenant | null>(null);
  const [passwordResetIssueEmail, setPasswordResetIssueEmail] = useState('');
  const [passwordResetIssueExpiresMinutes, setPasswordResetIssueExpiresMinutes] = useState(30);
  const [showPasswordResetIssueValidation, setShowPasswordResetIssueValidation] = useState(false);
  const [showPasswordResetIssueConfirm, setShowPasswordResetIssueConfirm] = useState(false);
  const [issuedPasswordResetToken, setIssuedPasswordResetToken] = useState<TenantPasswordResetIssueResponse | null>(null);
  const [resultDialog, setResultDialog] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const [showBootstrapHistoryDialog, setShowBootstrapHistoryDialog] = useState(false);
  const [loadingBootstrapHistory, setLoadingBootstrapHistory] = useState(false);
  const [bootstrapHistoryTenant, setBootstrapHistoryTenant] = useState<Tenant | null>(null);
  const [bootstrapHistoryItems, setBootstrapHistoryItems] = useState<TenantBootstrapHistoryItem[]>([]);
  const [bootstrapHistoryPage, setBootstrapHistoryPage] = useState(1);
  const [bootstrapHistoryLimit] = useState(10);
  const [bootstrapHistoryTotal, setBootstrapHistoryTotal] = useState(0);
  const [bootstrapHistoryDateRange, setBootstrapHistoryDateRange] = useState<[Date | null, Date | null] | null>(null);
  const [bootstrapHistoryStatusFilter, setBootstrapHistoryStatusFilter] = useState<BootstrapHistoryStatusFilter>('ALL');
  const [bootstrapHistoryVisibleFields, setBootstrapHistoryVisibleFields] = useState<BootstrapHistoryVisibleField[]>(bootstrapHistoryFieldOrder);
  const [tenantDatabaseBusy, setTenantDatabaseBusy] = useState<Record<number, boolean>>({});
  const [databaseConfirmState, setDatabaseConfirmState] = useState<{ mode: DatabaseActionMode; tenant: Tenant } | null>(null);
  const [isMultiTenantEnabled, setIsMultiTenantEnabled] = useState(true);
  const [form, setForm] = useState({
    slug: '',
    name: '',
    contactEmail: '',
    tierId: undefined as number | undefined,
    epsLimit: DEFAULT_EPS_LIMIT,
    storageQuotaGb: DEFAULT_STORAGE_QUOTA_GB,
    retentionDays: DEFAULT_RETENTION_DAYS,
    expiresAt: getDefaultExpiresAt() as Date | null,
    ipCidr: '',
  });

  const locale = i18n.language.startsWith('ko') ? 'ko-KR' : 'en-US';
  const bootstrapIssueEmailInvalid = showBootstrapIssueValidation
    && bootstrapIssueEmail.trim().length > 0
    && !isValidEmail(bootstrapIssueEmail.trim());
  const bootstrapIssueExpiresInvalid = showBootstrapIssueValidation
    && (
      !Number.isInteger(bootstrapIssueExpiresMinutes)
      || bootstrapIssueExpiresMinutes < BOOTSTRAP_TOKEN_MIN_EXPIRES_MINUTES
      || bootstrapIssueExpiresMinutes > BOOTSTRAP_TOKEN_MAX_EXPIRES_MINUTES
    );
  const passwordResetIssueEmailInvalid = showPasswordResetIssueValidation
    && !isValidEmail(passwordResetIssueEmail.trim());
  const passwordResetIssueExpiresInvalid = showPasswordResetIssueValidation
    && (
      !Number.isInteger(passwordResetIssueExpiresMinutes)
      || passwordResetIssueExpiresMinutes < PASSWORD_RESET_TOKEN_MIN_EXPIRES_MINUTES
      || passwordResetIssueExpiresMinutes > PASSWORD_RESET_TOKEN_MAX_EXPIRES_MINUTES
    );

  const openResultDialog = (title: string, message: string) => {
    setResultDialog({
      visible: true,
      title,
      message,
    });
  };

  const minSelectableDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [tenantRes, tierRes, quotaRes, authSettingsRes] = await Promise.all([
        api.get<Tenant[]>('/admin/tenants'),
        api.get<TenantTier[]>('/admin/tenants/tiers'),
        api.get<TenantQuota[]>('/admin/quotas'),
        api.get<AdminAuthSettings>('/admin/auth-settings'),
      ]);
      const quotaByTenantId = new Map(quotaRes.data.map((quota) => [quota.tenantId, quota]));
      setTenants(tenantRes.data.map((tenant) => ({
        ...tenant,
        quota: quotaByTenantId.get(tenant.id),
      })));
      setTiers(tierRes.data);
      setIsMultiTenantEnabled(authSettingsRes.data.isMultiTenantEnabled);
      if (!form.tierId && tierRes.data.length > 0) {
        setForm((prev) => ({
          ...prev,
          tierId: tierRes.data[0].id,
          storageQuotaGb: tierRes.data[0].dailyLogQuotaGb,
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const resetCreateForm = () => {
    setForm({
      slug: '',
      name: '',
      contactEmail: '',
      tierId: tiers[0]?.id,
      epsLimit: DEFAULT_EPS_LIMIT,
      storageQuotaGb: tiers[0]?.dailyLogQuotaGb ?? DEFAULT_STORAGE_QUOTA_GB,
      retentionDays: DEFAULT_RETENTION_DAYS,
      expiresAt: getDefaultExpiresAt(),
      ipCidr: '',
    });
    setFormErrors({});
  };

  const openCreateDialog = () => {
    if (!isMultiTenantEnabled) {
      openResultDialog(
        t('tenants.multiTenantDisabled.title'),
        t('tenants.multiTenantDisabled.detail'),
      );
      return;
    }

    setEditingTenant(null);
    resetCreateForm();
    setShowTenantDialog(true);
  };

  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setForm({
      slug: tenant.slug,
      name: tenant.name,
      contactEmail: tenant.contactEmail ?? '',
      tierId: tenant.tierId,
      epsLimit: tenant.quota?.epsLimit ?? DEFAULT_EPS_LIMIT,
      storageQuotaGb: tenant.quota?.storageQuotaGb ?? tenant.tier?.dailyLogQuotaGb ?? DEFAULT_STORAGE_QUOTA_GB,
      retentionDays: tenant.quota?.retentionDays ?? DEFAULT_RETENTION_DAYS,
      expiresAt: tenant.expiresAt ? new Date(tenant.expiresAt) : null,
      ipCidr: tenant.ipCidr ?? '',
    });
    setFormErrors({});
    setShowTenantDialog(true);
  };

  const closeTenantDialog = () => {
    setShowTenantDialog(false);
    setEditingTenant(null);
    setFormErrors({});
  };

    const openBootstrapIssueDialog = async (tenant: Tenant) => {
      const res = await api.get<{ requiresBootstrap: boolean }>(`/admin/tenants/${tenant.id}/bootstrap-status`);

      if (!res.data.requiresBootstrap) {
        openResultDialog(t('tenants.bootstrap.issueBlockedTitle'), t('tenants.bootstrap.issueBlockedDetail'));
        return;
      }

      setBootstrapIssueTenant(tenant);
      setBootstrapIssueEmail(tenant.contactEmail && isValidEmail(tenant.contactEmail) ? tenant.contactEmail : '');
      setBootstrapIssueExpiresMinutes(60);
      setShowBootstrapIssueValidation(false);
      setIssuedBootstrapToken(null);
      setShowBootstrapIssueDialog(true);
    };

  const closeBootstrapIssueDialog = () => {
    setShowBootstrapIssueDialog(false);
    setBootstrapIssueTenant(null);
    setBootstrapIssueEmail('');
    setBootstrapIssueExpiresMinutes(60);
    setShowBootstrapIssueValidation(false);
    setIssuedBootstrapToken(null);
  };

  const openPasswordResetIssueDialog = (tenant: Tenant) => {
    setPasswordResetIssueTenant(tenant);
    setPasswordResetIssueEmail(tenant.contactEmail && isValidEmail(tenant.contactEmail) ? tenant.contactEmail : '');
    setPasswordResetIssueExpiresMinutes(30);
    setShowPasswordResetIssueValidation(false);
    setIssuedPasswordResetToken(null);
    setShowPasswordResetIssueDialog(true);
  };

  const closePasswordResetIssueDialog = () => {
    setShowPasswordResetIssueDialog(false);
    setPasswordResetIssueTenant(null);
    setPasswordResetIssueEmail('');
    setPasswordResetIssueExpiresMinutes(30);
    setShowPasswordResetIssueValidation(false);
    setShowPasswordResetIssueConfirm(false);
    setIssuedPasswordResetToken(null);
  };

  const handleIssueBootstrapToken = async () => {
    if (!bootstrapIssueTenant) return;

    const currentTenant = bootstrapIssueTenant;

    setShowBootstrapIssueValidation(true);

    if (bootstrapIssueEmailInvalid) {
      return;
    }

    if (bootstrapIssueExpiresInvalid) {
      return;
    }

    const hasActiveBootstrapToken = async (tenantId: number): Promise<boolean> => {
      const res = await api.get<TenantBootstrapHistoryResponse>(`/admin/tenants/${tenantId}/bootstrap-tokens`, {
        params: {
          page: 1,
          limit: 20,
        },
      });

      const now = Date.now();
      return res.data.items.some((item) => !item.usedAt && new Date(item.expiresAt).getTime() >= now);
    };

    try {
      const alreadyHasActiveToken = await hasActiveBootstrapToken(bootstrapIssueTenant.id);
      if (alreadyHasActiveToken) {
        confirmDialog({
          header: t('tenants.bootstrap.issueOverwriteConfirmTitle'),
          message: t('tenants.bootstrap.issueOverwriteConfirmMessage', { name: currentTenant.name }),
          icon: 'pi pi-exclamation-triangle',
          acceptClassName: 'p-button-warning',
          acceptLabel: t('tenants.bootstrap.issueSubmit'),
          rejectLabel: t('common.cancel'),
          accept: () => {
            void handleIssueBootstrapTokenForced();
          },
        });
        return;
      }
    } catch {
      // 이력 사전 조회 실패는 발급 자체를 막지 않는다.
    }

    await handleIssueBootstrapTokenForced();
  };

  const handleIssueBootstrapTokenForced = async () => {
    if (!bootstrapIssueTenant) return;

    const currentTenant = bootstrapIssueTenant;

    setShowBootstrapIssueValidation(true);

    const normalizedEmail = bootstrapIssueEmail.trim();
    if (bootstrapIssueEmailInvalid) {
      return;
    }

    if (bootstrapIssueExpiresInvalid) {
      return;
    }

    setIssuingBootstrapToken(true);
    try {
      const res = await api.post<TenantBootstrapIssueResponse>(`/admin/tenants/${bootstrapIssueTenant.id}/bootstrap-token`, {
        email: normalizedEmail || undefined,
        expiresMinutes: bootstrapIssueExpiresMinutes,
      });
      setIssuedBootstrapToken(res.data);
      const issueDetail = res.data.deliveredToEmail && res.data.email
        ? t('tenants.bootstrap.issueSuccessDetailSent', { email: res.data.email })
        : res.data.email
          ? t('tenants.bootstrap.issueSuccessDetailNotSent', {
            email: res.data.email,
            reason: res.data.mailDeliveryError ?? '-',
          })
          : t('tenants.bootstrap.issueSuccessDetail');
      openResultDialog(t('tenants.bootstrap.issueSuccessTitle'), issueDetail);
    } catch (error: unknown) {
      const { status, message } = getApiErrorStatusAndMessage(error);

      if (status === 409) {
        confirmDialog({
          header: t('tenants.bootstrap.issueConflictTitle'),
          message: message ?? t('tenants.bootstrap.issueConflictDetail'),
          icon: 'pi pi-exclamation-triangle',
          acceptClassName: 'p-button-warning',
          acceptLabel: t('tenants.bootstrap.historyAction'),
          rejectLabel: t('common.cancel'),
          accept: () => {
            closeBootstrapIssueDialog();
            void openBootstrapHistoryDialog(currentTenant);
          },
        });
        return;
      }

      openResultDialog(t('tenants.bootstrap.issueFailedTitle'), message ?? t('tenants.bootstrap.issueFailedDetail'));
    } finally {
      setIssuingBootstrapToken(false);
    }
  };

  const handleCopyIssuedToken = async () => {
    if (!issuedBootstrapToken?.token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(issuedBootstrapToken.token);
      openResultDialog(t('tenants.bootstrap.copySuccessTitle'), t('tenants.bootstrap.copySuccessDetail'));
    } catch {
      openResultDialog(t('tenants.bootstrap.copyFailedTitle'), t('tenants.bootstrap.copyFailedDetail'));
    }
  };

  const handleCopyBootstrapRegistrationUrl = async () => {
    if (!issuedBootstrapToken?.registrationUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(issuedBootstrapToken.registrationUrl);
      openResultDialog(t('tenants.bootstrap.copyRegistrationLinkSuccessTitle'), t('tenants.bootstrap.copyRegistrationLinkSuccessDetail'));
    } catch {
      openResultDialog(t('tenants.bootstrap.copyRegistrationLinkFailedTitle'), t('tenants.bootstrap.copyRegistrationLinkFailedDetail'));
    }
  };

  const requestIssuePasswordResetToken = () => {
    if (!passwordResetIssueTenant) return;

    setShowPasswordResetIssueValidation(true);

    const normalizedEmail = passwordResetIssueEmail.trim();
    const isEmailValid = normalizedEmail.length > 0 && isValidEmail(normalizedEmail);
    const isExpiresValid = Number.isInteger(passwordResetIssueExpiresMinutes)
      && passwordResetIssueExpiresMinutes >= PASSWORD_RESET_TOKEN_MIN_EXPIRES_MINUTES
      && passwordResetIssueExpiresMinutes <= PASSWORD_RESET_TOKEN_MAX_EXPIRES_MINUTES;

    if (!isEmailValid || !isExpiresValid) {
      return;
    }

    setShowPasswordResetIssueConfirm(true);
  };

  const handleIssuePasswordResetToken = async () => {
    if (!passwordResetIssueTenant) return;

    const normalizedEmail = passwordResetIssueEmail.trim();
    const isEmailValid = normalizedEmail.length > 0 && isValidEmail(normalizedEmail);
    if (!isEmailValid) {
      return;
    }

    const isExpiresValid = Number.isInteger(passwordResetIssueExpiresMinutes)
      && passwordResetIssueExpiresMinutes >= PASSWORD_RESET_TOKEN_MIN_EXPIRES_MINUTES
      && passwordResetIssueExpiresMinutes <= PASSWORD_RESET_TOKEN_MAX_EXPIRES_MINUTES;
    if (!isExpiresValid) {
      return;
    }

    setShowPasswordResetIssueConfirm(false);
    setIssuingPasswordResetToken(true);
    try {
      const res = await api.post<TenantPasswordResetIssueResponse>(`/admin/tenants/${passwordResetIssueTenant.id}/password-reset-token`, {
        email: normalizedEmail,
        expiresMinutes: passwordResetIssueExpiresMinutes,
      });
      setIssuedPasswordResetToken(res.data);
      const issueDetail = res.data.deliveredToEmail
        ? t('tenants.passwordReset.issueSuccessDetailSent', { email: res.data.email })
        : t('tenants.passwordReset.issueSuccessDetailNotSent', {
          email: res.data.email,
          reason: res.data.mailDeliveryError ?? '-',
        });
      openResultDialog(t('tenants.passwordReset.issueSuccessTitle'), issueDetail);
    } catch (error: unknown) {
      const { message } = getApiErrorStatusAndMessage(error);
      openResultDialog(t('tenants.passwordReset.issueFailedTitle'), message ?? t('tenants.passwordReset.issueFailedDetail'));
    } finally {
      setIssuingPasswordResetToken(false);
    }
  };

  const handleCopyIssuedPasswordResetToken = async () => {
    if (!issuedPasswordResetToken?.token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(issuedPasswordResetToken.token);
      openResultDialog(t('tenants.passwordReset.copySuccessTitle'), t('tenants.passwordReset.copySuccessDetail'));
    } catch {
      openResultDialog(t('tenants.passwordReset.copyFailedTitle'), t('tenants.passwordReset.copyFailedDetail'));
    }
  };

  const loadBootstrapHistory = async (
    tenant: Tenant,
    page = 1,
    dateRange: [Date | null, Date | null] | null = bootstrapHistoryDateRange,
    status: BootstrapHistoryStatusFilter = bootstrapHistoryStatusFilter,
  ) => {
    setLoadingBootstrapHistory(true);
    try {
      const fromDate = dateRange?.[0] ?? null;
      const toDate = dateRange?.[1] ?? null;
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      if (to) {
        to.setHours(23, 59, 59, 999);
      }

      const res = await api.get<TenantBootstrapHistoryResponse>(`/admin/tenants/${tenant.id}/bootstrap-tokens`, {
        params: {
          page,
          limit: bootstrapHistoryLimit,
          from: from ? from.toISOString() : undefined,
          to: to ? to.toISOString() : undefined,
          status: status === 'ALL' ? undefined : status,
        },
      });

      setBootstrapHistoryItems(res.data.items);
      setBootstrapHistoryTotal(res.data.total);
      setBootstrapHistoryPage(res.data.page);
    } finally {
      setLoadingBootstrapHistory(false);
    }
  };

  const openBootstrapHistoryDialog = async (tenant: Tenant) => {
    setBootstrapHistoryTenant(tenant);
    setBootstrapHistoryDateRange(null);
    setBootstrapHistoryStatusFilter('ALL');
    setBootstrapHistoryPage(1);
    setBootstrapHistoryTotal(0);
    setBootstrapHistoryItems([]);
    setShowBootstrapHistoryDialog(true);
    await loadBootstrapHistory(tenant, 1, null, 'ALL');
  };

  const validateTenantForm = () => {
    const nextErrors: TenantFormErrors = {};
    const trimmedSlug = form.slug.trim();
    const trimmedName = form.name.trim();
    const trimmedEmail = form.contactEmail.trim();
    const trimmedCidr = form.ipCidr.trim();
    const normalizedIpCidrs = normalizeIpCidrList(trimmedCidr);
    const normalizedSlug = trimmedSlug.toLowerCase();

    if (!trimmedSlug) {
      nextErrors.slug = t('tenants.validation.slugRequired');
    } else if (!isValidTenantSlug(trimmedSlug)) {
      nextErrors.slug = t('tenants.validation.slugInvalid');
    }

    if (!trimmedName) {
      nextErrors.name = t('tenants.validation.nameRequired');
    }

    if (!trimmedEmail) {
      nextErrors.contactEmail = t('tenants.validation.contactEmailRequired');
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.contactEmail = t('tenants.validation.contactEmailInvalid');
    }

    if (!form.tierId) {
      nextErrors.tierId = t('tenants.validation.tierRequired');
    }

    if (!Number.isFinite(form.epsLimit) || form.epsLimit < 0) {
      nextErrors.epsLimit = t('tenants.validation.epsLimitInvalid');
    }

    if (!Number.isFinite(form.storageQuotaGb) || form.storageQuotaGb < 0) {
      nextErrors.storageQuotaGb = t('tenants.validation.storageQuotaGbInvalid');
    }

    if (!Number.isFinite(form.retentionDays) || form.retentionDays < 0) {
      nextErrors.retentionDays = t('tenants.validation.retentionDaysInvalid');
    }

    if (!isExpiresAtOptional) {
      if (!form.expiresAt) {
        nextErrors.expiresAt = t('tenants.validation.expiresAtRequired');
      } else if (Number.isNaN(form.expiresAt.getTime())) {
        nextErrors.expiresAt = t('tenants.validation.expiresAtInvalid');
      }
    }

    if (!trimmedCidr) {
      nextErrors.ipCidr = t('tenants.validation.ipCidrRequired');
    } else if (!normalizedIpCidrs) {
      nextErrors.ipCidr = t('tenants.validation.ipCidrInvalid');
    } else if (normalizedSlug !== 'system' && containsAllIpWildcard(normalizedIpCidrs)) {
      nextErrors.ipCidr = t('tenants.validation.ipCidrAllNotAllowed');
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveTenant = async () => {
    if (!validateTenantForm()) {
      return;
    }

    const normalizedIpCidrs = normalizeIpCidrList(form.ipCidr.trim());
    if (!normalizedIpCidrs) {
      return;
    }

    setSaving(true);
    try {
      const expiresAtPayload = isExpiresAtOptional
        ? null
        : (form.expiresAt ? form.expiresAt.toISOString().slice(0, 10) : undefined);

      if (editingTenant) {
        await api.patch(`/admin/tenants/${editingTenant.id}`, {
          name: form.name.trim(),
          contactEmail: form.contactEmail.trim(),
          tierId: form.tierId || undefined,
          epsLimit: form.epsLimit,
          storageQuotaGb: form.storageQuotaGb,
          retentionDays: form.retentionDays,
          expiresAt: expiresAtPayload,
          ipCidr: normalizedIpCidrs.join(','),
        });
      } else {
        await api.post('/admin/tenants', {
          slug: form.slug.trim(),
          name: form.name.trim(),
          contactEmail: form.contactEmail.trim(),
          tierId: form.tierId || undefined,
          epsLimit: form.epsLimit,
          storageQuotaGb: form.storageQuotaGb,
          retentionDays: form.retentionDays,
          expiresAt: expiresAtPayload,
          ipCidr: normalizedIpCidrs.join(','),
        });
      }

      closeTenantDialog();
      resetCreateForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async (id: number, current: string) => {
    const newStatus = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await api.patch(`/admin/tenants/${id}`, { status: newStatus });
    load();
  };

  const handleDelete = async (id: number) => {
    await api.patch(`/admin/tenants/${id}`, { status: 'DELETED' });
    load();
  };

  const handleRestore = async (id: number) => {
    await api.patch(`/admin/tenants/${id}`, { status: 'ACTIVE' });
    load();
  };

  const confirmStatusToggle = (row: Tenant) => {
    const isActive = row.status === 'ACTIVE';
    if (!isActive && !isMultiTenantEnabled && !isSystemTenant(row)) {
      openResultDialog(
        t('tenants.multiTenantDisabled.restoreTitle'),
        t('tenants.multiTenantDisabled.restoreDetail'),
      );
      return;
    }

    confirmDialog({
      header: t('tenants.confirmStatus.header'),
      message: t('tenants.confirmStatus.message', {
        name: row.name,
        action: isActive ? t('tenants.table.suspendBtn') : t('tenants.table.activateBtn'),
      }),
      icon: isActive ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
      acceptClassName: isActive ? 'p-button-warning' : 'p-button-success',
      acceptLabel: isActive ? t('tenants.table.suspendBtn') : t('tenants.table.activateBtn'),
      rejectLabel: t('common.cancel'),
      accept: () => {
        handleSuspend(row.id, row.status);
      },
    });
  };

  const confirmDeleteTenant = (row: Tenant) => {
    confirmDialog({
      header: t('tenants.confirmDelete.header'),
      message: t('tenants.confirmDelete.message', { name: row.name }),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: t('tenants.actions.delete'),
      rejectLabel: t('common.cancel'),
      accept: () => {
        handleDelete(row.id);
      },
    });
  };

  const confirmRestoreTenant = (row: Tenant) => {
    if (!isMultiTenantEnabled && !isSystemTenant(row)) {
      openResultDialog(
        t('tenants.multiTenantDisabled.restoreTitle'),
        t('tenants.multiTenantDisabled.restoreDetail'),
      );
      return;
    }

    confirmDialog({
      header: t('tenants.confirmRestore.header'),
      message: t('tenants.confirmRestore.message', { name: row.name }),
      icon: 'pi pi-refresh',
      acceptClassName: 'p-button-success',
      acceptLabel: t('tenants.actions.restore'),
      rejectLabel: t('common.cancel'),
      accept: () => {
        handleRestore(row.id);
      },
    });
  };

  const setTenantDatabaseBusyState = (tenantId: number, isBusy: boolean) => {
    setTenantDatabaseBusy((prev) => ({ ...prev, [tenantId]: isBusy }));
  };

  const getDatabaseStatusMessage = (tenantName: string, status: TenantDatabaseStatus) => {
    if (status.isReady) {
      return t('tenants.database.statusReadyDetail', {
        name: tenantName,
      });
    }

    return t('tenants.database.statusNotReadyDetail', {
      name: tenantName,
      missingTables: status.missingTables.length > 0 ? status.missingTables.join(', ') : t('tenants.database.none'),
    });
  };

  const checkTenantDatabaseStatus = async (row: Tenant) => {
    setTenantDatabaseBusyState(row.id, true);
    try {
      const res = await api.get<TenantDatabaseStatus>(`/admin/tenants/${row.id}/database-status`);
      openResultDialog(
        res.data.isReady ? t('tenants.database.statusReadyTitle') : t('tenants.database.statusNotReadyTitle'),
        getDatabaseStatusMessage(row.name, res.data),
      );
    } catch (error: unknown) {
      getApiErrorStatusAndMessage(error);
      openResultDialog(
        t('tenants.database.statusFailedTitle'),
        t('tenants.database.statusFailedDetail', { name: row.name }),
      );
    } finally {
      setTenantDatabaseBusyState(row.id, false);
    }
  };

  const recoverTenantDatabase = async (row: Tenant) => {
    setTenantDatabaseBusyState(row.id, true);
    try {
      const res = await api.post<TenantDatabaseStatus>(`/admin/tenants/${row.id}/database-recover`);
      openResultDialog(t('tenants.database.recoverSuccessTitle'), getDatabaseStatusMessage(row.name, res.data));
    } catch (error: unknown) {
      getApiErrorStatusAndMessage(error);
      openResultDialog(
        t('tenants.database.recoverFailedTitle'),
        t('tenants.database.recoverFailedDetail', { name: row.name }),
      );
    } finally {
      setTenantDatabaseBusyState(row.id, false);
    }
  };

  const resetTenantDatabase = async (row: Tenant) => {
    setTenantDatabaseBusyState(row.id, true);
    try {
      const res = await api.post<TenantDatabaseStatus>(`/admin/tenants/${row.id}/database-reset`);
      openResultDialog(t('tenants.database.resetSuccessTitle'), getDatabaseStatusMessage(row.name, res.data));
    } catch (error: unknown) {
      getApiErrorStatusAndMessage(error);
      openResultDialog(
        t('tenants.database.resetFailedTitle'),
        t('tenants.database.resetFailedDetail', { name: row.name }),
      );
    } finally {
      setTenantDatabaseBusyState(row.id, false);
    }
  };

  const confirmRecoverTenantDatabase = (row: Tenant) => {
    setDatabaseConfirmState({ mode: 'recover', tenant: row });
  };

  const confirmResetTenantDatabase = (row: Tenant) => {
    setDatabaseConfirmState({ mode: 'reset', tenant: row });
  };

  const filteredTenants = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const statusMatched = statusFilter === 'ALL' || tenant.status === statusFilter;
      if (!statusMatched) return false;
      if (!keyword) return true;
      return [
        tenant.slug,
        tenant.name,
        tenant.contactEmail,
        tenant.ipCidr ?? '',
        tenant.tier?.name ?? String(tenant.tierId),
      ].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [tenants, search, statusFilter]);

  const statusFilterOptions = useMemo(
    () => [
      { label: t('tenants.filters.all'), value: 'ALL' as const },
      { label: t('common.active'), value: 'ACTIVE' as const },
      { label: t('common.suspend'), value: 'SUSPENDED' as const },
      { label: t('tenants.filters.deleted'), value: 'DELETED' as const },
    ],
    [t],
  );

  const renderStatusFilterOption = (option: { label: string; value: 'ALL' | Tenant['status'] }) => {
    return (
      <span className={`tenant-filter-pill tenant-filter-pill-${option.value.toLowerCase()}`}>
        {option.label}
      </span>
    );
  };

  const fieldOptions = useMemo(
    () => [
      { label: t('tenants.table.id'), value: 'id' as const },
      { label: t('tenants.table.slug'), value: 'slug' as const },
      { label: t('tenants.table.name'), value: 'name' as const },
      { label: t('common.status'), value: 'status' as const },
      { label: t('tenants.table.tier'), value: 'tier' as const },
      { label: t('tenants.table.expiresAt'), value: 'expiresAt' as const },
      { label: t('tenants.table.ipCidr'), value: 'ipCidr' as const },
      { label: t('tenants.table.contactEmail'), value: 'contactEmail' as const },
      { label: t('common.createdAt'), value: 'createdAt' as const },
    ],
    [t],
  );

  const tierOptions = useMemo(
    () =>
      tiers.map((tier) => ({
        label: `${tier.name} (${tier.code} · ${formatTierLimit(tier.dailyLogQuotaGb, 'GB', t('tenants.tiers.unlimited'))} / ${formatTierLimit(tier.maxUsers, '', t('tenants.tiers.unlimited'))})`,
        value: tier.id,
      })),
    [tiers, t],
  );

  const selectedTier = useMemo(
    () => tiers.find((tier) => tier.id === form.tierId) ?? null,
    [tiers, form.tierId],
  );

  const isExpiresAtOptional = useMemo(
    () => form.slug.trim() === 'system' || isUnlimitedTier(selectedTier),
    [form.slug, selectedTier],
  );

  const isFieldVisible = (field: TenantVisibleField) => visibleFields.includes(field);

  const isBootstrapHistoryFieldVisible = (field: BootstrapHistoryVisibleField) => bootstrapHistoryVisibleFields.includes(field);

  const handleToggleField = (field: TenantVisibleField) => {
    const exists = visibleFields.includes(field);

    if (exists) {
      if (visibleFields.length === 1) return;
      setVisibleFields(visibleFields.filter((item) => item !== field));
      return;
    }

    const next = [...visibleFields, field].sort(
      (a, b) => tenantFieldOrder.indexOf(a) - tenantFieldOrder.indexOf(b),
    );
    setVisibleFields(next);
  };

  const handleToggleBootstrapHistoryField = (field: BootstrapHistoryVisibleField) => {
    const exists = bootstrapHistoryVisibleFields.includes(field);

    if (exists) {
      if (bootstrapHistoryVisibleFields.length === 1) return;
      setBootstrapHistoryVisibleFields(bootstrapHistoryVisibleFields.filter((item) => item !== field));
      return;
    }

    const next = [...bootstrapHistoryVisibleFields, field].sort(
      (a, b) => bootstrapHistoryFieldOrder.indexOf(a) - bootstrapHistoryFieldOrder.indexOf(b),
    );
    setBootstrapHistoryVisibleFields(next);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  const tenantSummary = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
      suspended: tenants.filter((tenant) => tenant.status === 'SUSPENDED').length,
      deleted: tenants.filter((tenant) => tenant.status === 'DELETED').length,
    }),
    [tenants],
  );

  const bootstrapHistoryFieldOptions = useMemo(
    () => [
      { label: t('tenants.bootstrap.issuedAt'), value: 'createdAt' as const },
      { label: t('common.status'), value: 'status' as const },
      { label: t('common.email'), value: 'email' as const },
      { label: t('tenants.bootstrap.expiresAt'), value: 'expiresAt' as const },
      { label: t('tenants.bootstrap.usedAt'), value: 'usedAt' as const },
      { label: t('tenants.bootstrap.issuedBy'), value: 'issuedByMasterUserId' as const },
    ],
    [t],
  );

  const bootstrapHistoryStatusFilterOptions = useMemo(
    () => [
      { label: t('tenants.filters.all'), value: 'ALL' as const },
      { label: t('tenants.bootstrap.status.active'), value: 'ACTIVE' as const },
      { label: t('tenants.bootstrap.status.expired'), value: 'EXPIRED' as const },
      { label: t('tenants.bootstrap.status.used'), value: 'USED' as const },
    ],
    [t],
  );

  const renderBootstrapHistoryStatusFilterOption = (option: { label: string; value: BootstrapHistoryStatusFilter }) => {
    const suffix = option.value === 'ACTIVE'
      ? 'active'
      : option.value === 'EXPIRED'
        ? 'suspended'
        : option.value === 'USED'
          ? 'deleted'
          : 'all';

    return (
      <span className={`tenant-filter-pill tenant-filter-pill-${suffix}`}>
        {option.label}
      </span>
    );
  };

  const buildTenantActions = (row: Tenant): MenuItem[] => [
    {
      label: t('tenants.actions.edit'),
      icon: 'pi pi-pencil',
      command: () => openEditDialog(row),
    },
    {
      separator: true,
    },
    {
      label: row.status === 'ACTIVE' ? t('tenants.table.suspendBtn') : t('tenants.table.activateBtn'),
      icon: row.status === 'ACTIVE' ? 'pi pi-pause' : 'pi pi-play',
      className: row.status === 'ACTIVE' ? 'tenant-menu-action-warning' : 'tenant-menu-action-safe',
      disabled:
        row.status === 'DELETED'
        || isSystemTenant(row)
        || (row.status === 'SUSPENDED' && !isMultiTenantEnabled && !isSystemTenant(row)),
      command: () => {
        confirmStatusToggle(row);
      },
    },
    {
      separator: true,
    },
    {
      label: t('tenants.actions.restore'),
      icon: 'pi pi-refresh',
      className: 'tenant-menu-action-restore',
      disabled: row.status !== 'DELETED' || (!isMultiTenantEnabled && !isSystemTenant(row)),
      command: () => {
        confirmRestoreTenant(row);
      },
    },
    {
      separator: true,
    },
    {
      label: t('tenants.bootstrap.issueAction'),
      icon: 'pi pi-key',
      command: () => openBootstrapIssueDialog(row),
    },
    {
      label: t('tenants.bootstrap.historyAction'),
      icon: 'pi pi-history',
      command: () => {
        void openBootstrapHistoryDialog(row);
      },
    },
    {
      label: t('tenants.passwordReset.issueAction'),
      icon: 'pi pi-unlock',
      command: () => {
        openPasswordResetIssueDialog(row);
      },
    },
    {
      separator: true,
    },
    {
      label: t('tenants.database.statusAction'),
      icon: 'pi pi-database',
      disabled: tenantDatabaseBusy[row.id] === true,
      command: () => {
        void checkTenantDatabaseStatus(row);
      },
    },
    {
      label: t('tenants.database.recoverAction'),
      icon: 'pi pi-wrench',
      className: 'tenant-menu-action-warning',
      disabled: tenantDatabaseBusy[row.id] === true,
      command: () => {
        confirmRecoverTenantDatabase(row);
      },
    },
    {
      label: t('tenants.database.resetAction'),
      icon: 'pi pi-trash',
      className: 'tenant-menu-action-danger',
      disabled: tenantDatabaseBusy[row.id] === true,
      command: () => {
        confirmResetTenantDatabase(row);
      },
    },
    {
      separator: true,
    },
    {
      label: t('tenants.actions.delete'),
      icon: 'pi pi-trash',
      className: 'tenant-menu-action-danger',
        disabled: row.status === 'DELETED' || isSystemTenant(row),
      command: () => {
        confirmDeleteTenant(row);
      },
    },
  ];

  return (
    <div className="admin-page tenants-page">
      <ResultDialog
        visible={resultDialog.visible}
        title={resultDialog.title}
        message={resultDialog.message}
        tone="info"
        confirmLabel={t('common.confirm')}
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
      />
      <ActionConfirmDialog
        visible={databaseConfirmState !== null}
        title={databaseConfirmState?.mode === 'reset' ? t('tenants.database.resetConfirmTitle') : t('tenants.database.recoverConfirmTitle')}
        message={
          databaseConfirmState?.mode === 'reset'
            ? t('tenants.database.resetConfirmMessage', { name: databaseConfirmState?.tenant.name ?? '' })
            : t('tenants.database.recoverConfirmMessage', { name: databaseConfirmState?.tenant.name ?? '' })
        }
        confirmLabel={databaseConfirmState?.mode === 'reset' ? t('tenants.database.resetAction') : t('tenants.database.recoverAction')}
        cancelLabel={t('common.cancel')}
        icon={databaseConfirmState?.mode === 'reset' ? 'pi pi-trash' : 'pi pi-database'}
        severity={databaseConfirmState?.mode === 'reset' ? 'danger' : 'warn'}
        onCancel={() => setDatabaseConfirmState(null)}
        onConfirm={() => {
          if (databaseConfirmState) {
            if (databaseConfirmState.mode === 'reset') {
              void resetTenantDatabase(databaseConfirmState.tenant);
            } else {
              void recoverTenantDatabase(databaseConfirmState.tenant);
            }
          }
          setDatabaseConfirmState(null);
        }}
      />
      <ActionConfirmDialog
        visible={showPasswordResetIssueConfirm}
        title={t('tenants.passwordReset.confirmTitle')}
        message={t('tenants.passwordReset.confirmMessage', {
          name: passwordResetIssueTenant?.name ?? '',
          email: passwordResetIssueEmail.trim(),
        })}
        confirmLabel={t('tenants.passwordReset.issueSubmit')}
        cancelLabel={t('common.cancel')}
        icon="pi pi-unlock"
        severity="warn"
        onCancel={() => setShowPasswordResetIssueConfirm(false)}
        onConfirm={() => {
          void handleIssuePasswordResetToken();
        }}
      />
      <ConfirmDialog />
      <div className="admin-page-header page-header">
        <h1>{t('tenants.title')}</h1>
        <Button
          label={t('tenants.createBtn')}
          icon="pi pi-plus"
          outlined
          disabled={!isMultiTenantEnabled}
          tooltip={!isMultiTenantEnabled ? t('tenants.multiTenantDisabled.detail') : undefined}
          tooltipOptions={!isMultiTenantEnabled ? { position: 'top' } : undefined}
          onClick={openCreateDialog}
        />
      </div>
      {!isMultiTenantEnabled && (
        <Message
          severity="warn"
          text={t('tenants.multiTenantDisabled.detail')}
          className="mb-3"
        />
      )}
      <div className="tenant-summary-grid mb-3">
        <div className="tenant-summary-card">
          <span className="summary-label">{t('tenants.summary.total')}</span>
          <span className="summary-value">{tenantSummary.total}</span>
        </div>
        <div className="tenant-summary-card tenant-summary-card-active">
          <span className="summary-label">{t('tenants.summary.active')}</span>
          <span className="summary-value">{tenantSummary.active}</span>
        </div>
        <div className="tenant-summary-card tenant-summary-card-suspended">
          <span className="summary-label">{t('tenants.summary.suspended')}</span>
          <span className="summary-value">{tenantSummary.suspended}</span>
        </div>
        <div className="tenant-summary-card tenant-summary-card-deleted">
          <span className="summary-label">{t('tenants.summary.deleted')}</span>
          <span className="summary-value">{tenantSummary.deleted}</span>
        </div>
      </div>

      <div className="admin-table-shell">
        <div className="admin-table-toolbar">
          <div className="tenants-toolbar-left">
            <div className="tenants-search-shell">
              <IconField iconPosition="left" className="tenants-search">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full tenants-search-input p-inputtext-sm"
                  placeholder={t('tenants.searchPlaceholder')}
                />
              </IconField>
              {!!searchInput && (
                <Button
                  type="button"
                  icon="pi pi-times"
                  text
                  rounded
                  severity="secondary"
                  className="tenants-search-clear"
                  aria-label={t('tenants.toolbar.clearSearch')}
                  tooltip={t('tenants.toolbar.clearSearch')}
                  tooltipOptions={{ position: 'top' }}
                  onClick={handleClearSearch}
                />
              )}
            </div>
          </div>
          <div className="tenants-quick-filters">
            <SelectButton
              value={statusFilter}
              options={statusFilterOptions}
              optionLabel="label"
              optionValue="value"
              className="tenants-status-select"
              itemTemplate={renderStatusFilterOption}
              onChange={(e) => setStatusFilter(e.value as 'ALL' | Tenant['status'])}
            />
            <Button
              type="button"
              icon="pi pi-refresh"
              outlined 
              severity="secondary"
              className="admin-icon-button-xs"
              aria-label={t('tenants.toolbar.refresh')}
              tooltip={t('tenants.toolbar.refresh')}
              tooltipOptions={{ position: 'top' }}
              loading={loading}
              onClick={load}
            />
            <Button
              type="button"
              icon="pi pi-sliders-h"
              outlined 
              severity="secondary"
              className="admin-icon-button-xs"
              aria-label={t('tenants.toolbar.fieldSettings')}
              tooltip={t('tenants.toolbar.fieldSettings')}
              tooltipOptions={{ position: 'top' }}
              onClick={(event) => fieldPanelRef.current?.toggle(event)}
            />
            <OverlayPanel ref={fieldPanelRef} className="tenants-field-panel">
              <div className="tenants-field-panel-list">
                {fieldOptions.map((fieldOption) => (
                  <label
                    key={fieldOption.value}
                    className="tenants-field-option"
                    htmlFor={`tenant-field-${fieldOption.value}`}
                  >
                    <Checkbox
                      inputId={`tenant-field-${fieldOption.value}`}
                      checked={visibleFields.includes(fieldOption.value)}
                      onChange={() => handleToggleField(fieldOption.value)}
                    />
                    <span>{fieldOption.label}</span>
                  </label>
                ))}
              </div>
            </OverlayPanel>
          </div>
        </div>
        <CommonDataTable
          value={filteredTenants}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          removableSort
          rowClassName={(row: Tenant) => (row.status === 'DELETED' ? 'tenant-row-deleted' : '')}
          className="admin-table"
        >
        {isFieldVisible('id') && (
          <Column field="id" header={t('tenants.table.id')} style={{ width: '72px' }} bodyClassName="text-right" headerClassName="text-right" />
        )}
        {isFieldVisible('slug') && (
          <Column
            field="slug"
            header={t('tenants.table.slug')}
            style={{ minWidth: '9rem' }}
            body={(row: Tenant) => <Tag value={row.slug} rounded className="tenant-slug-tag" />}
          />
        )}
        {isFieldVisible('name') && (
          <Column
            field="name"
            header={t('tenants.table.name')}
            style={{ minWidth: '12rem' }}
            body={(row: Tenant) => <span className="tenant-name-cell">{row.name}</span>}
          />
        )}
        {isFieldVisible('status') && (
          <Column
            field="status"
            header={t('common.status')}
            body={(row: Tenant) => (
              <Tag
                value={t(statusLabelKey(row.status))}
                severity={statusSeverity(row.status) as any}                
                rounded
                className={`tenant-status-tag tenant-status-${row.status.toLowerCase()}`}
              />
            )}
          />
        )}
        {isFieldVisible('tier') && (
          <Column
            field="tierId"
            header={t('tenants.table.tier')}
            style={{ minWidth: '15rem' }}
            body={(row: Tenant) => (
              <div className="flex flex-column gap-1">
                <span>{row.tier?.name ?? '-'}</span>
                {row.quota && (
                  <small className="text-color-secondary">
                    {`${t('quota.table.epsLimit')} ${formatTierLimit(row.quota.epsLimit, '', t('quota.unlimited'))} · ${t('quota.table.storageQuotaGb')} ${formatTierLimit(row.quota.storageQuotaGb, 'GB', t('quota.unlimited'))} · ${t('quota.table.retentionDays')} ${formatTierLimit(row.quota.retentionDays, t('quota.dialog.daysSuffix'), t('quota.unlimited'))}`}
                  </small>
                )}
              </div>
            )}
          />
        )}
        {isFieldVisible('expiresAt') && (
          <Column
            field="expiresAt"
            header={t('tenants.table.expiresAt')}
            style={{ minWidth: '8.5rem' }}
            body={(row: Tenant) => (row.expiresAt ? new Date(row.expiresAt).toLocaleDateString(locale) : '-')}
          />
        )}
        {isFieldVisible('ipCidr') && (
          <Column
            field="ipCidr"
            header={t('tenants.table.ipCidr')}
            style={{ minWidth: '10rem' }}
            body={(row: Tenant) => row.ipCidr || '-'}
          />
        )}
        {isFieldVisible('contactEmail') && (
          <Column field="contactEmail" header={t('tenants.table.contactEmail')} style={{ minWidth: '15rem' }} />
        )}
        {isFieldVisible('createdAt') && (
          <Column
            field="createdAt"
            header={t('common.createdAt')}
            sortable
            bodyClassName="text-right"
            headerClassName="text-right"
            style={{ width: '27rem' }}
            body={(row: Tenant) => formatDateTimeSeconds(row.createdAt)}
          />
        )}
        <Column
          header={t('common.actions')}
          style={{ width: '8.5rem' }}
          body={(row: Tenant) => (
            <div className="tenant-action-stack">
              <Button
                size="small"
                icon={row.status === 'DELETED' ? 'pi pi-refresh' : row.status === 'ACTIVE' ? 'pi pi-pause' : 'pi pi-play'}
                severity={row.status === 'DELETED' ? 'success' : row.status === 'ACTIVE' ? 'warning' : 'success'}
                tooltip={
                  row.status === 'DELETED'
                    ? t('tenants.actions.restore')
                    : row.status === 'ACTIVE'
                      ? t('tenants.table.suspendBtn')
                      : t('tenants.table.activateBtn')
                }
                tooltipOptions={{ position: 'top' }}
                text
                rounded
                aria-label={
                  row.status === 'DELETED'
                    ? t('tenants.actions.restore')
                    : row.status === 'ACTIVE'
                      ? t('tenants.table.suspendBtn')
                      : t('tenants.table.activateBtn')
                }
                  disabled={
                    (row.status !== 'DELETED' && isSystemTenant(row))
                    || (row.status === 'DELETED' && !isMultiTenantEnabled && !isSystemTenant(row))
                    || (row.status === 'SUSPENDED' && !isMultiTenantEnabled && !isSystemTenant(row))
                  }
                onClick={() => (row.status === 'DELETED' ? confirmRestoreTenant(row) : confirmStatusToggle(row))}
              />
              <Button
                size="small"
                icon="pi pi-ellipsis-v"
                severity="secondary"
                text
                rounded
                tooltip={t('tenants.actions.more')}
                tooltipOptions={{ position: 'top' }}
                aria-haspopup
                aria-controls={`tenant-row-menu-${row.id}`}
                aria-label={t('tenants.actions.more')}
                onClick={(event) => rowMenusRef.current[row.id]?.toggle(event)}
              />
              <Menu
                id={`tenant-row-menu-${row.id}`}
                popup
                model={buildTenantActions(row)}
                className="tenant-row-menu"
                ref={(el) => {
                  rowMenusRef.current[row.id] = el;
                }}
              />
            </div>
          )}
        />
        </CommonDataTable>
      </div>

      <Dialog
        header={editingTenant ? t('tenants.dialog.editTitle') : t('tenants.dialog.title')}
        visible={showTenantDialog}
        style={{ width: '640px', maxWidth: '96vw' }}
        className="tenant-create-dialog"
        onHide={closeTenantDialog}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div className="grid m-0">
            <div className="col-12 md:col-4 pl-0 pr-0 md:pr-2">
              <label className="admin-form-label">
                {t('tenants.dialog.slug')}
                <span className="p-error ml-1">*</span>
              </label>
              <InputText
                value={form.slug}
                disabled={!!editingTenant}
                onChange={(e) => {
                  setForm({ ...form, slug: e.target.value });
                  if (formErrors.slug) {
                    setFormErrors({ ...formErrors, slug: undefined });
                  }
                }}
                className={`w-full tenants-search-input p-inputtext-sm ${formErrors.slug ? 'p-invalid' : ''}`}
                placeholder={t('tenants.dialog.slugPlaceholder')}
              />
              {formErrors.slug && <small className="p-error">{formErrors.slug}</small>}
            </div>
            <div className="col-12 md:col-4 pl-0 pr-0 md:px-1">
              <label className="admin-form-label">
                {t('tenants.dialog.companyName')}
                <span className="p-error ml-1">*</span>
              </label>
              <InputText
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (formErrors.name) {
                    setFormErrors({ ...formErrors, name: undefined });
                  }
                }}
                className={`w-full tenants-search-input p-inputtext-sm ${formErrors.name ? 'p-invalid' : ''}`}
              />
              {formErrors.name && <small className="p-error">{formErrors.name}</small>}
            </div>
            <div className="col-12 md:col-4 pr-0 md:pl-2">
              <label className="admin-form-label">
                {t('tenants.dialog.contactEmail')}
                <span className="p-error ml-1">*</span>
              </label>
              <InputText
                value={form.contactEmail}
                onChange={(e) => {
                  setForm({ ...form, contactEmail: e.target.value });
                  if (formErrors.contactEmail) {
                    setFormErrors({ ...formErrors, contactEmail: undefined });
                  }
                }}
                className={`w-full tenants-search-input p-inputtext-sm ${formErrors.contactEmail ? 'p-invalid' : ''}`}
              />
              {formErrors.contactEmail && <small className="p-error">{formErrors.contactEmail}</small>}
            </div>
          </div>
          <div className="grid m-0">
            <div className="col-12 md:col-6 pl-0 pr-0 md:pr-2">
              <label className="admin-form-label">
                {t('tenants.dialog.tierCode')}
                <span className="p-error ml-1">*</span>
              </label>
              <Dropdown
                value={form.tierId ?? null}
                options={tierOptions}
                optionLabel="label"
                optionValue="value"
                placeholder={t('tenants.dialog.tierPlaceholder')}
                className={`w-full ${formErrors.tierId ? 'p-invalid' : ''}`}
                onChange={(e) => {
                  const nextTierId = e.value ? Number(e.value) : undefined;
                  const nextTier = tiers.find((tier) => tier.id === nextTierId);
                  const nextExpiresAt = isUnlimitedTier(nextTier ?? null)
                    ? null
                    : (form.expiresAt ?? getDefaultExpiresAt());
                  setForm({
                    ...form,
                    tierId: nextTierId,
                    storageQuotaGb: nextTier?.dailyLogQuotaGb ?? form.storageQuotaGb,
                    expiresAt: nextExpiresAt,
                  });
                  if (formErrors.tierId) {
                    setFormErrors({ ...formErrors, tierId: undefined });
                  }
                }}
              />
              {formErrors.tierId && <small className="p-error">{formErrors.tierId}</small>}
            </div>
            <div className="col-12 md:col-6 pl-0 pr-0 md:pr-2">
              <label className="admin-form-label">{t('tenants.dialog.expiresAt')}</label>
              <Calendar
                value={form.expiresAt}
                onChange={(e) => {
                  setForm({ ...form, expiresAt: (e.value as Date | null) ?? null });
                  if (formErrors.expiresAt) {
                    setFormErrors({ ...formErrors, expiresAt: undefined });
                  }
                }}
                dateFormat="yy-mm-dd"
                showIcon
                showButtonBar
                touchUI={false}
                minDate={minSelectableDate}
                inputClassName="w-full"
                disabled={isExpiresAtOptional}
                className={`w-full ${formErrors.expiresAt ? 'p-invalid' : ''}`}
              />
              {formErrors.expiresAt && <small className="p-error">{formErrors.expiresAt}</small>}
              {isExpiresAtOptional && (
                <small className="text-color-secondary">{t('tenants.dialog.expiresAtOptionalUnlimited')}</small>
              )}
            </div>
          </div>
          <Message
            severity="info"
            className="w-full"
            content={
              <div className="flex flex-column">
                <div className="font-semibold">{t('tenants.dialog.quotaSectionTitle')}</div>
                <small className="text-color-secondary">{t('tenants.dialog.quotaSectionHelp')}</small>
                {selectedTier && (
                  <small className="text-color-secondary">
                    {t('tenants.dialog.tierDefaults', {
                      dailyLogQuotaGb: formatTierLimit(selectedTier.dailyLogQuotaGb, 'GB', t('quota.unlimited')),
                      maxUsers: formatTierLimit(selectedTier.maxUsers, '', t('tenants.tiers.unlimited')),
                    })}
                  </small>
                )}
              </div>
            }
          />
          <div className="grid m-0">
            <div className="col-12 md:col-4 pl-0 pr-0 md:pr-2">
              <label className="admin-form-label">{t('quota.dialog.epsLimit')}</label>
              <InputNumber
                value={form.epsLimit}
                min={0}
                onValueChange={(e) => {
                  setForm({ ...form, epsLimit: e.value ?? 0 });
                  if (formErrors.epsLimit) {
                    setFormErrors({ ...formErrors, epsLimit: undefined });
                  }
                }}
                className={`w-full ${formErrors.epsLimit ? 'p-invalid' : ''}`}
                suffix={t('quota.dialog.epsSuffix')}
              />
              {formErrors.epsLimit && <small className="p-error">{formErrors.epsLimit}</small>}
            </div>
            <div className="col-12 md:col-4 pl-0 pr-0 md:pr-2">
              <label className="admin-form-label">{t('quota.dialog.storageQuotaGb')}</label>
              <InputNumber
                value={form.storageQuotaGb}
                min={0}
                onValueChange={(e) => {
                  setForm({ ...form, storageQuotaGb: e.value ?? 0 });
                  if (formErrors.storageQuotaGb) {
                    setFormErrors({ ...formErrors, storageQuotaGb: undefined });
                  }
                }}
                className={`w-full ${formErrors.storageQuotaGb ? 'p-invalid' : ''}`}
                suffix=" GB"
              />
              {formErrors.storageQuotaGb && <small className="p-error">{formErrors.storageQuotaGb}</small>}
            </div>
            <div className="col-12 md:col-4 pl-0 pr-0">
              <label className="admin-form-label">{t('quota.dialog.retentionDays')}</label>
              <InputNumber
                value={form.retentionDays}
                min={0}
                onValueChange={(e) => {
                  setForm({ ...form, retentionDays: e.value ?? 0 });
                  if (formErrors.retentionDays) {
                    setFormErrors({ ...formErrors, retentionDays: undefined });
                  }
                }}
                className={`w-full ${formErrors.retentionDays ? 'p-invalid' : ''}`}
                suffix={t('quota.dialog.daysSuffix')}
              />
              {formErrors.retentionDays && <small className="p-error">{formErrors.retentionDays}</small>}
            </div>
          </div>
          <small className="text-color-secondary">{t('quota.dialog.zeroMeansUnlimited')}</small>
          <div>
            <label className="admin-form-label">
              {t('tenants.dialog.ipCidr')}
              <span className="p-error ml-1">*</span>
            </label>
            <InputText
              value={form.ipCidr}
              onChange={(e) => {
                setForm({ ...form, ipCidr: e.target.value });
                if (formErrors.ipCidr) {
                  setFormErrors({ ...formErrors, ipCidr: undefined });
                }
              }}
              className={`w-full tenants-search-input p-inputtext-sm ${formErrors.ipCidr ? 'p-invalid' : ''}`}
              placeholder={t('tenants.dialog.ipCidrPlaceholder')}
            />
            {formErrors.ipCidr && <small className="p-error">{formErrors.ipCidr}</small>}
          </div>
          <div className="flex gap-1 justify-between pt-1">
            <div className="flex gap-1"></div>
            <div className="flex gap-1 flex-1 flex-row-reverse">
              <Button
                label={t('common.save')}
                onClick={handleSaveTenant}
                loading={saving}
                size="small"
              />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        header={t('tenants.bootstrap.issueTitle')}
        visible={showBootstrapIssueDialog}
        style={{ width: '520px', maxWidth: '96vw' }}
        onHide={closeBootstrapIssueDialog}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="admin-form-label">{t('tenants.table.name')}</label>
            <InputText value={bootstrapIssueTenant?.name ?? ''} disabled className="w-full" />
          </div>
          <div>
            <label className="admin-form-label">{t('common.email')}</label>
            <InputText
              value={bootstrapIssueEmail}
              onChange={(e) => {
                setBootstrapIssueEmail(e.target.value);
              }}
              className="w-full"
              invalid={bootstrapIssueEmailInvalid}
              placeholder={t('tenants.bootstrap.emailPlaceholder')}
            />
            {bootstrapIssueEmailInvalid && <small className="p-error block mt-1">{t('tenants.bootstrap.issueInvalidEmailDetail')}</small>}
          </div>
          <div>
            <label className="admin-form-label">{t('tenants.bootstrap.expiresMinutes')}</label>
            <InputText
              type="number"
              min={BOOTSTRAP_TOKEN_MIN_EXPIRES_MINUTES}
              max={BOOTSTRAP_TOKEN_MAX_EXPIRES_MINUTES}
              value={String(bootstrapIssueExpiresMinutes)}
              onChange={(e) => {
                const value = Number(e.target.value);
                setBootstrapIssueExpiresMinutes(Number.isFinite(value) ? Math.trunc(value) : 60);
              }}
              className={`w-full ${bootstrapIssueExpiresInvalid ? 'p-invalid' : ''}`}
            />
            {bootstrapIssueExpiresInvalid && (
              <small className="p-error block mt-1">
                {t('tenants.bootstrap.issueInvalidExpiresDetail', { min: BOOTSTRAP_TOKEN_MIN_EXPIRES_MINUTES, max: BOOTSTRAP_TOKEN_MAX_EXPIRES_MINUTES })}
              </small>
            )}
            <small className="text-color-secondary">
              {t('tenants.bootstrap.expiresMinutesHint', { min: BOOTSTRAP_TOKEN_MIN_EXPIRES_MINUTES, max: BOOTSTRAP_TOKEN_MAX_EXPIRES_MINUTES })}
            </small>
          </div>

          {issuedBootstrapToken && (
            <div className="p-3 border-1 border-round surface-border">
              <div className="text-sm mb-2"><strong>{t('tenants.bootstrap.tokenLabel')}</strong></div>
              <div className="flex gap-2 align-items-center">
                <InputText value={issuedBootstrapToken.token} readOnly className="w-full font-mono" />
                <Button
                  type="button"
                  icon="pi pi-copy"
                  text
                  rounded
                  severity="secondary"
                  aria-label={t('tenants.bootstrap.copyToken')}
                  tooltip={t('tenants.bootstrap.copyToken')}
                  tooltipOptions={{ position: 'top' }}
                  onClick={() => {
                    void handleCopyIssuedToken();
                  }}
                />
              </div>
              <small className="block mt-2">
                {t('tenants.bootstrap.expiresAt')}: {formatDateTimeSeconds(issuedBootstrapToken.expiresAt)}
              </small>
              {issuedBootstrapToken.email && !issuedBootstrapToken.deliveredToEmail && (
                <small className="block mt-2 text-orange-600">
                  {t('tenants.bootstrap.issueSuccessDetailNotSent', {
                    email: issuedBootstrapToken.email,
                    reason: issuedBootstrapToken.mailDeliveryError ?? '-',
                  })}
                </small>
              )}
              {issuedBootstrapToken.registrationUrl && (
                <div className="mt-3">
                  <div className="text-sm mb-2"><strong>{t('tenants.bootstrap.registrationLinkLabel')}</strong></div>
                  <div className="flex gap-2 align-items-center">
                    <InputText value={issuedBootstrapToken.registrationUrl} readOnly className="w-full" />
                    <Button
                      type="button"
                      icon="pi pi-link"
                      text
                      rounded
                      severity="secondary"
                      aria-label={t('tenants.bootstrap.copyRegistrationLink')}
                      tooltip={t('tenants.bootstrap.copyRegistrationLink')}
                      tooltipOptions={{ position: 'top' }}
                      onClick={() => {
                        void handleCopyBootstrapRegistrationUrl();
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-content-end gap-2">
            <Button outlined label={t('common.cancel')} onClick={closeBootstrapIssueDialog} />
            <Button
              label={t('tenants.bootstrap.issueSubmit')}
              icon="pi pi-key"
              loading={issuingBootstrapToken}
              onClick={() => {
                void handleIssueBootstrapToken();
              }}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={t('tenants.bootstrap.historyTitle')}
        visible={showBootstrapHistoryDialog}
        style={{ width: '1120px', maxWidth: '96vw' }}
        onHide={() => {
          setShowBootstrapHistoryDialog(false);
          setBootstrapHistoryTenant(null);
          setBootstrapHistoryItems([]);
        }}
      >
        <div className="text-sm mb-3">{bootstrapHistoryTenant?.name ?? ''}</div>
        <div className="admin-table-shell">
          <div className="admin-table-toolbar">
            <div className="tenants-toolbar-left">
              <div className="tenants-search-shell" style={{ maxWidth: '420px', width: '100%' }}>
                <IconField iconPosition="left" className="tenants-search">
                  <InputIcon className="pi pi-calendar" />
                  <Calendar
                    value={bootstrapHistoryDateRange as Date[] | null}
                    onChange={(e) => {
                      const value = e.value as Date[] | null;
                      const nextRange = !value || value.length === 0
                        ? null
                        : [value[0] ?? null, value[1] ?? null] as [Date | null, Date | null];
                      setBootstrapHistoryDateRange(nextRange);

                      if (!bootstrapHistoryTenant) return;
                      void loadBootstrapHistory(bootstrapHistoryTenant, 1, nextRange, bootstrapHistoryStatusFilter);
                    }}
                    selectionMode="range"
                    dateFormat="yy-mm-dd"
                    readOnlyInput
                    hideOnRangeSelection
                    className="w-full"
                    placeholder={t('tenants.bootstrap.filterRangePlaceholder')}
                  />
                </IconField>
              </div>
            </div>
            <div className="tenants-quick-filters">
              <SelectButton
                value={bootstrapHistoryStatusFilter}
                options={bootstrapHistoryStatusFilterOptions}
                optionLabel="label"
                optionValue="value"
                className="tenants-status-select"
                itemTemplate={renderBootstrapHistoryStatusFilterOption}
                onChange={(e) => {
                  const nextStatus = e.value as BootstrapHistoryStatusFilter;
                  setBootstrapHistoryStatusFilter(nextStatus);

                  if (!bootstrapHistoryTenant) return;
                  void loadBootstrapHistory(bootstrapHistoryTenant, 1, bootstrapHistoryDateRange, nextStatus);
                }}
              />
              <Button
                type="button"
                icon="pi pi-refresh"
                outlined
                severity="secondary"
                className="admin-icon-button-xs"
                aria-label={t('tenants.toolbar.refresh')}
                tooltip={t('tenants.toolbar.refresh')}
                tooltipOptions={{ position: 'top' }}
                loading={loadingBootstrapHistory}
                onClick={() => {
                  if (!bootstrapHistoryTenant) return;
                  void loadBootstrapHistory(bootstrapHistoryTenant, bootstrapHistoryPage, bootstrapHistoryDateRange, bootstrapHistoryStatusFilter);
                }}
              />
              <Button
                type="button"
                icon="pi pi-sliders-h"
                outlined
                severity="secondary"
                className="admin-icon-button-xs"
                aria-label={t('tenants.toolbar.fieldSettings')}
                tooltip={t('tenants.toolbar.fieldSettings')}
                tooltipOptions={{ position: 'top' }}
                onClick={(event) => bootstrapHistoryFieldPanelRef.current?.toggle(event)}
              />
              <OverlayPanel ref={bootstrapHistoryFieldPanelRef} className="tenants-field-panel">
                <div className="tenants-field-panel-list">
                  {bootstrapHistoryFieldOptions.map((fieldOption) => (
                    <label
                      key={fieldOption.value}
                      className="tenants-field-option"
                      htmlFor={`bootstrap-history-field-${fieldOption.value}`}
                    >
                      <Checkbox
                        inputId={`bootstrap-history-field-${fieldOption.value}`}
                        checked={bootstrapHistoryVisibleFields.includes(fieldOption.value)}
                        onChange={() => handleToggleBootstrapHistoryField(fieldOption.value)}
                      />
                      <span>{fieldOption.label}</span>
                    </label>
                  ))}
                </div>
              </OverlayPanel>
            </div>
          </div>
          <CommonDataTable
            value={bootstrapHistoryItems}
            loading={loadingBootstrapHistory}
            paginator
            lazy
            first={(bootstrapHistoryPage - 1) * bootstrapHistoryLimit}
            rows={bootstrapHistoryLimit}
            totalRecords={bootstrapHistoryTotal}
            onPage={(event) => {
              if (!bootstrapHistoryTenant) return;
              const nextPage = Math.floor((event.first ?? 0) / bootstrapHistoryLimit) + 1;
              void loadBootstrapHistory(bootstrapHistoryTenant, nextPage, bootstrapHistoryDateRange, bootstrapHistoryStatusFilter);
            }}
            className="admin-table"
          >
          {isBootstrapHistoryFieldVisible('createdAt') && (
            <Column field="createdAt" header={t('tenants.bootstrap.issuedAt')} body={(row: TenantBootstrapHistoryItem) => formatDateTimeSeconds(row.createdAt)} />
          )}
          {isBootstrapHistoryFieldVisible('status') && (
            <Column
              header={t('common.status')}
              body={(row: TenantBootstrapHistoryItem) => {
                const status = bootstrapTokenStatus(row);
                return (
                  <Tag
                    value={t(`tenants.bootstrap.status.${status.toLowerCase()}`)}
                    severity={bootstrapTokenStatusSeverity(status) as any}
                    rounded
                  />
                );
              }}
            />
          )}
          {isBootstrapHistoryFieldVisible('email') && (
            <Column field="email" header={t('common.email')} body={(row: TenantBootstrapHistoryItem) => row.email ?? '-'} />
          )}
          {isBootstrapHistoryFieldVisible('expiresAt') && (
            <Column field="expiresAt" header={t('tenants.bootstrap.expiresAt')} body={(row: TenantBootstrapHistoryItem) => formatDateTimeSeconds(row.expiresAt)} />
          )}
          {isBootstrapHistoryFieldVisible('usedAt') && (
            <Column field="usedAt" header={t('tenants.bootstrap.usedAt')} body={(row: TenantBootstrapHistoryItem) => (row.usedAt ? formatDateTimeSeconds(row.usedAt) : '-')} />
          )}
          {isBootstrapHistoryFieldVisible('issuedByMasterUserId') && (
            <Column field="issuedByMasterUserId" header={t('tenants.bootstrap.issuedBy')} body={(row: TenantBootstrapHistoryItem) => row.issuedByMasterUserId ?? '-'} />
          )}
          </CommonDataTable>
        </div>
      </Dialog>

      <Dialog
        header={t('tenants.passwordReset.issueTitle')}
        visible={showPasswordResetIssueDialog}
        style={{ width: '520px', maxWidth: '96vw' }}
        onHide={closePasswordResetIssueDialog}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="admin-form-label">{t('tenants.table.name')}</label>
            <InputText value={passwordResetIssueTenant?.name ?? ''} disabled className="w-full" />
          </div>
          <div>
            <label className="admin-form-label">
              {t('common.email')}
              <span className="p-error ml-1">*</span>
            </label>
            <InputText
              value={passwordResetIssueEmail}
              onChange={(e) => {
                setPasswordResetIssueEmail(e.target.value);
              }}
              className={`w-full ${passwordResetIssueEmailInvalid ? 'p-invalid' : ''}`}
              placeholder={t('tenants.passwordReset.emailPlaceholder')}
            />
            {passwordResetIssueEmailInvalid && <small className="p-error block mt-1">{t('tenants.passwordReset.issueInvalidEmailDetail')}</small>}
          </div>
          <div>
            <label className="admin-form-label">{t('tenants.passwordReset.expiresMinutes')}</label>
            <InputText
              type="number"
              min={PASSWORD_RESET_TOKEN_MIN_EXPIRES_MINUTES}
              max={PASSWORD_RESET_TOKEN_MAX_EXPIRES_MINUTES}
              value={String(passwordResetIssueExpiresMinutes)}
              onChange={(e) => {
                const value = Number(e.target.value);
                setPasswordResetIssueExpiresMinutes(Number.isFinite(value) ? Math.trunc(value) : 30);
              }}
              className={`w-full ${passwordResetIssueExpiresInvalid ? 'p-invalid' : ''}`}
            />
            {passwordResetIssueExpiresInvalid && (
              <small className="p-error block mt-1">
                {t('tenants.passwordReset.issueInvalidExpiresDetail', { min: PASSWORD_RESET_TOKEN_MIN_EXPIRES_MINUTES, max: PASSWORD_RESET_TOKEN_MAX_EXPIRES_MINUTES })}
              </small>
            )}
            <small className="text-color-secondary">
              {t('tenants.passwordReset.expiresMinutesHint', { min: PASSWORD_RESET_TOKEN_MIN_EXPIRES_MINUTES, max: PASSWORD_RESET_TOKEN_MAX_EXPIRES_MINUTES })}
            </small>
          </div>

          {issuedPasswordResetToken && (
            <div className="p-3 border-1 border-round surface-border">
              <div className="text-sm mb-2"><strong>{t('tenants.passwordReset.tokenLabel')}</strong></div>
              <div className="flex gap-2 align-items-center">
                <InputText value={issuedPasswordResetToken.token} readOnly className="w-full font-mono" />
                <Button
                  type="button"
                  icon="pi pi-copy"
                  text
                  rounded
                  severity="secondary"
                  aria-label={t('tenants.passwordReset.copyToken')}
                  tooltip={t('tenants.passwordReset.copyToken')}
                  tooltipOptions={{ position: 'top' }}
                  onClick={() => {
                    void handleCopyIssuedPasswordResetToken();
                  }}
                />
              </div>
              <small className="block mt-2">
                {t('tenants.passwordReset.expiresAt')}: {formatDateTimeSeconds(issuedPasswordResetToken.expiresAt)}
              </small>
              {!issuedPasswordResetToken.deliveredToEmail && (
                <small className="block mt-2 text-orange-600">
                  {t('tenants.passwordReset.issueSuccessDetailNotSent', {
                    email: issuedPasswordResetToken.email,
                    reason: issuedPasswordResetToken.mailDeliveryError ?? '-',
                  })}
                </small>
              )}
            </div>
          )}

          <div className="flex justify-content-end gap-2">
            <Button outlined label={t('common.cancel')} onClick={closePasswordResetIssueDialog} />
            <Button
              label={t('tenants.passwordReset.issueSubmit')}
              icon="pi pi-unlock"
              loading={issuingPasswordResetToken}
              onClick={() => {
                requestIssuePasswordResetToken();
              }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TenantsPage;
