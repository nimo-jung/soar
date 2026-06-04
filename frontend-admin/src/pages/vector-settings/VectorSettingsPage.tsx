import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/AdminButton';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import api from '../../api';
import CommonDataTable from '../../components/CommonDataTable';
import ResultDialog, { type ResultDialogTone } from '../../components/ResultDialog';
import { formatDateTimeSeconds } from '../../utils/date';

const INGESTION_MODES = ['syslog', 'snmp', 'http', 'cmd', 'file', 'kafka'] as const;
type IngestionMode = typeof INGESTION_MODES[number];

interface VectorParserProfile {
  vendor: string;
  ingestionMode: IngestionMode;
  matchIndicators: string[];
  deviceCodeRegex: string;
  vrlScript?: string;
  enabled: boolean;
}

interface VectorSettingsResponse {
  parserProfiles: VectorParserProfile[];
  seedParserProfiles: VectorParserProfile[];
  outputTopic: string;
  defaultOutputTopic: string;
  quarantineTopic: string;
  defaultQuarantineTopic: string;
  allowUnknownVendor: boolean;
  configVersion: number;
  appliedVersion: number;
  appliedAt: string | null;
  applyStatus: 'IDLE' | 'APPLIED' | 'FAILED';
  applyMessage: string | null;
}

interface VectorApplyResponse {
  applyStatus: 'APPLIED' | 'FAILED';
  message: string;
  configPath: string;
  renderedBytes: number;
  reloadAttempted: boolean;
  reloadSucceeded: boolean;
}

interface VectorDryRunResponse {
  valid: boolean;
  configPath: string;
  renderedBytes: number;
  warnings: string[];
  preview: string;
}

interface VectorApplyHistoryItem {
  id: string;
  attemptedAt: string;
  configVersion: number;
  applyStatus: 'APPLIED' | 'FAILED';
  message: string;
  configPath: string;
  renderedBytes: number;
  reloadAttempted: boolean;
  reloadSucceeded: boolean;
}

interface ResultDialogState {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  tone: ResultDialogTone;
}

interface ProfileDialogForm {
  vendor: string;
  ingestionMode: IngestionMode;
  matchIndicatorsText: string;
  deviceCodeRegex: string;
  vrlScript: string;
  enabled: boolean;
}

const DEFAULT_PROFILE_FORM: ProfileDialogForm = {
  vendor: '',
  ingestionMode: 'syslog',
  matchIndicatorsText: '',
  deviceCodeRegex: '(?P<device_code>[A-Za-z0-9._:-]{3,128})',
  vrlScript: '',
  enabled: true,
};

const normalizeApplyStatus = (value: unknown): VectorSettingsResponse['applyStatus'] => {
  if (value === 'APPLIED' || value === 'FAILED' || value === 'IDLE') {
    return value;
  }
  return 'IDLE';
};

const normalizeIngestionMode = (value: unknown): IngestionMode => {
  if (typeof value === 'string' && INGESTION_MODES.includes(value as IngestionMode)) {
    return value as IngestionMode;
  }
  return 'syslog';
};

const normalizeParserProfile = (profile: Partial<VectorParserProfile>): VectorParserProfile => {
  const vendor = typeof profile.vendor === 'string' ? profile.vendor : '';
  const matchIndicators = Array.isArray(profile.matchIndicators)
    ? profile.matchIndicators.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    vendor,
    ingestionMode: normalizeIngestionMode(profile.ingestionMode),
    matchIndicators,
    deviceCodeRegex: typeof profile.deviceCodeRegex === 'string' ? profile.deviceCodeRegex : '',
    vrlScript: typeof profile.vrlScript === 'string' ? profile.vrlScript : '',
    enabled: Boolean(profile.enabled),
  };
};

const normalizeSettingsResponse = (data: Partial<VectorSettingsResponse>) => ({
  outputTopic: typeof data.outputTopic === 'string' ? data.outputTopic : '',
  defaultOutputTopic: typeof data.defaultOutputTopic === 'string' ? data.defaultOutputTopic : 'logs.parsed.input',
  quarantineTopic: typeof data.quarantineTopic === 'string' ? data.quarantineTopic : '',
  defaultQuarantineTopic: typeof data.defaultQuarantineTopic === 'string' ? data.defaultQuarantineTopic : 'logs.quarantine',
  allowUnknownVendor: Boolean(data.allowUnknownVendor),
  seedParserProfiles: Array.isArray(data.seedParserProfiles)
    ? data.seedParserProfiles.map((profile) => normalizeParserProfile(profile))
    : [],
  parserProfiles: Array.isArray(data.parserProfiles)
    ? data.parserProfiles.map((profile) => normalizeParserProfile(profile))
    : [],
  meta: {
    configVersion: typeof data.configVersion === 'number' ? data.configVersion : 1,
    appliedVersion: typeof data.appliedVersion === 'number' ? data.appliedVersion : 0,
    appliedAt: typeof data.appliedAt === 'string' ? data.appliedAt : null,
    applyStatus: normalizeApplyStatus(data.applyStatus),
    applyMessage: typeof data.applyMessage === 'string' ? data.applyMessage : null,
  },
});

const VectorSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [advancedDialogVisible, setAdvancedDialogVisible] = useState(false);

  const [outputTopic, setOutputTopic] = useState('logs.parsed.input');
  const [defaultOutputTopic, setDefaultOutputTopic] = useState('logs.parsed.input');
  const [quarantineTopic, setQuarantineTopic] = useState('logs.quarantine');
  const [defaultQuarantineTopic, setDefaultQuarantineTopic] = useState('logs.quarantine');
  const [allowUnknownVendor, setAllowUnknownVendor] = useState(false);
  const [seedParserProfiles, setSeedParserProfiles] = useState<VectorParserProfile[]>([]);
  const [parserProfiles, setParserProfiles] = useState<VectorParserProfile[]>([]);
  const [historyRows, setHistoryRows] = useState<VectorApplyHistoryItem[]>([]);
  const [, setMeta] = useState<Pick<VectorSettingsResponse, 'configVersion' | 'appliedVersion' | 'appliedAt' | 'applyStatus' | 'applyMessage'>>({
    configVersion: 1,
    appliedVersion: 0,
    appliedAt: null,
    applyStatus: 'IDLE',
    applyMessage: null,
  });

  const [profileDialogVisible, setProfileDialogVisible] = useState(false);
  const [editingProfileIndex, setEditingProfileIndex] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileDialogForm>(DEFAULT_PROFILE_FORM);

  const [resultDialog, setResultDialog] = useState<ResultDialogState>({
    visible: false,
    title: '',
    message: '',
    icon: 'pi pi-info-circle',
    tone: 'info',
  });

  const modeOptions = INGESTION_MODES.map((mode) => ({
    value: mode,
    label: t(`vectorSettings.ingestionModes.${mode}`),
  }));

  const profilesEmpty = showValidation && parserProfiles.length === 0;

  const extractApiMessage = (error: unknown): string => {
    const rawMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    if (typeof rawMessage === 'string') {
      return rawMessage;
    }
    if (Array.isArray(rawMessage)) {
      return rawMessage.filter((item): item is string => typeof item === 'string').join(', ');
    }
    return '';
  };

  const openResultDialog = (
    title: string,
    message: string,
    options?: Partial<Pick<ResultDialogState, 'icon' | 'tone'>>,
  ) => {
    setResultDialog({
      visible: true,
      title,
      message,
      icon: options?.icon ?? 'pi pi-info-circle',
      tone: options?.tone ?? 'info',
    });
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get<VectorSettingsResponse>('/admin/vector-settings');
      const normalized = normalizeSettingsResponse(response.data);
      setOutputTopic(normalized.outputTopic);
      setDefaultOutputTopic(normalized.defaultOutputTopic);
      setQuarantineTopic(normalized.quarantineTopic);
      setDefaultQuarantineTopic(normalized.defaultQuarantineTopic);
      setAllowUnknownVendor(normalized.allowUnknownVendor);
      setSeedParserProfiles(normalized.seedParserProfiles);
      setParserProfiles(normalized.parserProfiles);
      setMeta(normalized.meta);
    } catch (loadError: unknown) {
      const message = extractApiMessage(loadError) || t('vectorSettings.loadFailed');
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), message, {
        icon: 'pi pi-times-circle',
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadApplyHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get<VectorApplyHistoryItem[]>('/admin/vector-settings/apply-history');
      setHistoryRows(response.data);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadPageData = async () => {
    await Promise.all([loadSettings(), loadApplyHistory()]);
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const openCreateProfileDialog = () => {
    setEditingProfileIndex(null);
    setProfileForm(DEFAULT_PROFILE_FORM);
    setProfileDialogVisible(true);
  };

  const openEditProfileDialog = (profile: VectorParserProfile, index: number) => {
    const normalized = normalizeParserProfile(profile);
    setEditingProfileIndex(index);
    setProfileForm({
      vendor: normalized.vendor,
      ingestionMode: normalized.ingestionMode,
      matchIndicatorsText: normalized.matchIndicators.join(', '),
      deviceCodeRegex: normalized.deviceCodeRegex,
      vrlScript: normalized.vrlScript ?? '',
      enabled: normalized.enabled,
    });
    setProfileDialogVisible(true);
  };

  const saveProfileDialog = () => {
    const vendor = profileForm.vendor.trim().toLowerCase();
    const matchIndicators = profileForm.matchIndicatorsText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (!vendor) {
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), t('vectorSettings.validation.vendorRequired'), {
        icon: 'pi pi-times-circle',
        tone: 'error',
      });
      return;
    }

    if (matchIndicators.length === 0) {
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), t('vectorSettings.validation.matchIndicatorsRequired'), {
        icon: 'pi pi-times-circle',
        tone: 'error',
      });
      return;
    }

    if (!profileForm.deviceCodeRegex.trim()) {
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), t('vectorSettings.validation.deviceCodeRegexRequired'), {
        icon: 'pi pi-times-circle',
        tone: 'error',
      });
      return;
    }

    const duplicated = parserProfiles.some((profile, idx) => (
      profile.vendor === vendor && idx !== editingProfileIndex
    ));
    if (duplicated) {
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), t('vectorSettings.validation.vendorDuplicated', { vendor }), {
        icon: 'pi pi-times-circle',
        tone: 'error',
      });
      return;
    }

    const nextProfile: VectorParserProfile = {
      vendor,
      ingestionMode: profileForm.ingestionMode,
      matchIndicators,
      deviceCodeRegex: profileForm.deviceCodeRegex.trim(),
      vrlScript: profileForm.vrlScript.trim(),
      enabled: profileForm.enabled,
    };

    if (editingProfileIndex === null) {
      setParserProfiles((prev) => [...prev, nextProfile]);
    } else {
      setParserProfiles((prev) => prev.map((item, idx) => (idx === editingProfileIndex ? nextProfile : item)));
    }

    setProfileDialogVisible(false);
  };

  const deleteProfile = (index: number) => {
    setParserProfiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const missingSeedProfiles = seedParserProfiles.filter(
    (seedProfile) => !parserProfiles.some((profile) => profile.vendor === seedProfile.vendor),
  );
  const hasMissingSeedProfiles = missingSeedProfiles.length > 0;

  const applySeedProfiles = () => {
    if (seedParserProfiles.length === 0) {
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), t('vectorSettings.seed.empty'), {
        icon: 'pi pi-info-circle',
        tone: 'info',
      });
      return;
    }

    const profilesToAdd = missingSeedProfiles;

    if (profilesToAdd.length === 0) {
      openResultDialog(t('vectorSettings.resultDialog.successTitle'), t('vectorSettings.seed.noneAdded'), {
        icon: 'pi pi-info-circle',
        tone: 'info',
      });
      return;
    }

    setParserProfiles((prev) => [...prev, ...profilesToAdd]);
    openResultDialog(t('vectorSettings.resultDialog.successTitle'), t('vectorSettings.seed.added', { count: profilesToAdd.length }), {
      icon: 'pi pi-check-circle',
      tone: 'success',
    });
  };

  const overwriteSeedProfiles = () => {
    if (seedParserProfiles.length === 0) {
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), t('vectorSettings.seed.empty'), {
        icon: 'pi pi-info-circle',
        tone: 'info',
      });
      return;
    }

    const seedByVendor = new Map(seedParserProfiles.map((profile) => [profile.vendor, profile]));
    const customProfiles = parserProfiles.filter((profile) => !seedByVendor.has(profile.vendor));
    const replacedCount = parserProfiles.filter((profile) => seedByVendor.has(profile.vendor)).length;

    setParserProfiles([...seedParserProfiles, ...customProfiles]);
    openResultDialog(
      t('vectorSettings.resultDialog.successTitle'),
      t('vectorSettings.seed.overwritten', { replaced: replacedCount, count: seedParserProfiles.length }),
      {
        icon: 'pi pi-check-circle',
        tone: 'success',
      },
    );
  };

  const handleSave = async () => {
    setShowValidation(true);

    if (profilesEmpty) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        parserProfiles,
        outputTopic: outputTopic.trim(),
        quarantineTopic: quarantineTopic.trim(),
        allowUnknownVendor,
      };

      const response = await api.patch<VectorSettingsResponse>('/admin/vector-settings', payload);
      const normalized = normalizeSettingsResponse(response.data);
      setOutputTopic(normalized.outputTopic);
      setDefaultOutputTopic(normalized.defaultOutputTopic);
      setQuarantineTopic(normalized.quarantineTopic);
      setDefaultQuarantineTopic(normalized.defaultQuarantineTopic);
      setAllowUnknownVendor(normalized.allowUnknownVendor);
      setParserProfiles(normalized.parserProfiles);
      setMeta(normalized.meta);

      openResultDialog(t('vectorSettings.resultDialog.successTitle'), t('vectorSettings.saveSuccess'), {
        icon: 'pi pi-check-circle',
        tone: 'success',
      });
    } catch (saveError: unknown) {
      const message = extractApiMessage(saveError) || t('vectorSettings.saveFailed');
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), message, {
        icon: 'pi pi-times-circle',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDryRun = async () => {
    setDryRunning(true);
    try {
      await api.patch('/admin/vector-settings', {
        parserProfiles,
        outputTopic: outputTopic.trim(),
        quarantineTopic: quarantineTopic.trim(),
        allowUnknownVendor,
      });

      const response = await api.post<VectorDryRunResponse>('/admin/vector-settings/dry-run');
      const warningText = response.data.warnings.length > 0
        ? `\n${response.data.warnings.join('\n')}`
        : '';

      const dialogMessage = t('vectorSettings.dryRunResult', {
        valid: response.data.valid ? 'true' : 'false',
        configPath: response.data.configPath,
        renderedBytes: response.data.renderedBytes,
      }) + warningText;

      openResultDialog(t('vectorSettings.resultDialog.successTitle'), dialogMessage, {
        icon: 'pi pi-check-circle',
        tone: 'success',
      });
      await loadSettings();
    } catch (dryRunError: unknown) {
      const message = extractApiMessage(dryRunError) || t('vectorSettings.dryRunFailed');
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), message, {
        icon: 'pi pi-times-circle',
        tone: 'error',
      });
    } finally {
      setDryRunning(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.patch('/admin/vector-settings', {
        parserProfiles,
        outputTopic: outputTopic.trim(),
        quarantineTopic: quarantineTopic.trim(),
        allowUnknownVendor,
      });

      const response = await api.post<VectorApplyResponse>('/admin/vector-settings/apply');
      await loadPageData();

      const dialogMessage = t('vectorSettings.applyResult', {
        status: response.data.applyStatus,
        message: response.data.message,
        configPath: response.data.configPath,
        renderedBytes: response.data.renderedBytes,
      });

      openResultDialog(t('vectorSettings.resultDialog.successTitle'), dialogMessage, {
        icon: response.data.applyStatus === 'APPLIED' ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle',
        tone: response.data.applyStatus === 'APPLIED' ? 'success' : 'warn',
      });
    } catch (applyError: unknown) {
      const message = extractApiMessage(applyError) || t('vectorSettings.applyFailed');
      openResultDialog(t('vectorSettings.resultDialog.failedTitle'), message, {
        icon: 'pi pi-times-circle',
        tone: 'error',
      });
    } finally {
      setApplying(false);
    }
  };

  const profileModeBody = (row: VectorParserProfile) => t(`vectorSettings.ingestionModes.${row.ingestionMode}`);

  const profileEnabledBody = (row: VectorParserProfile) => (
    <Tag
      value={row.enabled ? t('common.active') : t('common.inactive')}
      severity={row.enabled ? 'success' : 'danger'}
    />
  );

  const profileIndicatorsBody = (row: VectorParserProfile) => row.matchIndicators.join(', ');
  const profileRegexBody = (row: VectorParserProfile) => (
    <code className="text-xs">{row.deviceCodeRegex}</code>
  );
  const profileVrlBody = (row: VectorParserProfile) => (
    <Tag
      value={row.vrlScript && row.vrlScript.trim().length > 0 ? t('vectorSettings.profileTable.vrlCustom') : t('vectorSettings.profileTable.vrlDefault')}
      severity={row.vrlScript && row.vrlScript.trim().length > 0 ? 'info' : 'contrast'}
    />
  );
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('vectorSettings.title')}</h1>
          <p className="admin-page-subtitle">{t('vectorSettings.description')}</p>
        </div>
      </div>

      <ResultDialog
        visible={resultDialog.visible}
        title={resultDialog.title}
        message={resultDialog.message}
        tone={resultDialog.tone}
        icon={resultDialog.icon}
        confirmLabel={t('common.confirm')}
        onHide={() => setResultDialog((prev) => ({ ...prev, visible: false }))}
        width="460px"
      />

      <Dialog
        header={editingProfileIndex === null ? t('vectorSettings.profileDialog.createTitle') : t('vectorSettings.profileDialog.editTitle')}
        visible={profileDialogVisible}
        style={{ width: '760px', maxWidth: '96vw' }}
        onHide={() => setProfileDialogVisible(false)}
        footer={(
          <div className="flex justify-content-end gap-2">
            <Button label={t('common.cancel')} text onClick={() => setProfileDialogVisible(false)} />
            <Button label={t('common.save')} onClick={saveProfileDialog} />
          </div>
        )}
      >
        <div className="grid pt-2">
          <div className="col-12 md:col-6">
            <label className="admin-form-label">{t('vectorSettings.profileDialog.vendor')}</label>
            <InputText
              value={profileForm.vendor ?? ''}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, vendor: e.target.value }))}
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6">
            <label className="admin-form-label">{t('vectorSettings.profileDialog.ingestionMode')}</label>
            <Dropdown
              value={profileForm.ingestionMode}
              options={modeOptions}
              onChange={(e) => setProfileForm((prev) => ({
                ...prev,
                ingestionMode: normalizeIngestionMode(e.value),
              }))}
              className="w-full"
            />
          </div>

          <div className="col-12">
            <label className="admin-form-label">{t('vectorSettings.profileDialog.matchIndicators')}</label>
            <InputText
              value={profileForm.matchIndicatorsText ?? ''}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, matchIndicatorsText: e.target.value }))}
              className="w-full"
              placeholder={t('vectorSettings.profileDialog.matchIndicatorsPlaceholder')}
            />
          </div>

          <div className="col-12">
            <label className="admin-form-label">{t('vectorSettings.profileDialog.deviceCodeRegex')}</label>
            <InputText
              value={profileForm.deviceCodeRegex ?? ''}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, deviceCodeRegex: e.target.value }))}
              className="w-full"
            />
          </div>

          <div className="col-12">
            <label className="admin-form-label">{t('vectorSettings.profileDialog.vrlScript')}</label>
            <InputTextarea
              rows={8}
              value={profileForm.vrlScript ?? ''}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, vrlScript: e.target.value }))}
              className="w-full font-mono text-sm"
              placeholder={t('vectorSettings.profileDialog.vrlScriptPlaceholder')}
            />
          </div>

          <div className="col-12">
            <div className="flex align-items-center gap-3 mt-2">
              <InputSwitch
                checked={profileForm.enabled}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, enabled: Boolean(e.value) }))}
              />
              <span>{profileForm.enabled ? t('common.active') : t('common.inactive')}</span>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        header={t('vectorSettings.advanced.dialogTitle')}
        visible={advancedDialogVisible}
        style={{ width: '760px', maxWidth: '96vw' }}
        onHide={() => setAdvancedDialogVisible(false)}
        footer={(
          <div className="flex justify-content-end gap-2">
            <Button label={t('vectorSettings.advanced.close')} onClick={() => setAdvancedDialogVisible(false)} />
          </div>
        )}
      >
        <div className="pt-2 text-sm line-height-3">
          <div className="font-semibold mb-2">{t('vectorSettings.pipelineSummaryTitle')}</div>
          <div className="text-color-secondary mb-2">{t('vectorSettings.pipelineSummaryDescription')}</div>
          <ol className="pl-3 mt-0 mb-3 line-height-3">
            <li>{t('vectorSettings.pipelineSteps.s1')}</li>
            <li>{t('vectorSettings.pipelineSteps.s2')}</li>
            <li>{t('vectorSettings.pipelineSteps.s3')}</li>
            <li>{t('vectorSettings.pipelineSteps.s4')}</li>
            <li>{t('vectorSettings.pipelineSteps.s5')}</li>
          </ol>
          <div className="text-color-secondary mb-3">{t('vectorSettings.classificationPriority')}</div>

          <div>
            {t('vectorSettings.outputTopicLabel')} : {outputTopic || '-'}
            {(outputTopic || '') !== defaultOutputTopic ? ` (${t('vectorSettings.defaultValueLabel')}: ${defaultOutputTopic})` : ''}
          </div>
          <div>
            {t('vectorSettings.quarantineTopicLabel')} : {quarantineTopic || '-'}
            {(quarantineTopic || '') !== defaultQuarantineTopic ? ` (${t('vectorSettings.defaultValueLabel')}: ${defaultQuarantineTopic})` : ''}
          </div>
          <div>{t('vectorSettings.routerOutputTopicLabel')} : raw-logs.{'{tenant_id}'}</div>
        </div>
      </Dialog>

      <Card className="admin-card monitoring-panel-card">
        <div className="flex justify-content-end mb-4">
          <Button
            type="button"
            icon="pi pi-cog"
            text
            label={t('vectorSettings.advanced.openButton')}
            onClick={() => setAdvancedDialogVisible(true)}
          />
        </div>

        <div className="grid">
          <div className="flex justify-content-between gap-3">
            <div className="flex align-items-center gap-3">
              <InputSwitch
                checked={allowUnknownVendor}
                onChange={(event) => setAllowUnknownVendor(Boolean(event.value))}
                disabled={loading}
              />
              <span className="font-medium">{allowUnknownVendor ? t('vectorSettings.enabled') : t('vectorSettings.disabled')}</span>
            </div>
            <label className="admin-form-label mt-2">{t('vectorSettings.allowUnknownVendorHelp')}</label>
          </div>

          <div className="col-12">
            <div className="flex justify-content-between align-items-center mb-2">
              <label className="admin-form-label m-0">{t('vectorSettings.parserProfilesLabel')}</label>
              <div className="flex gap-2">
                {hasMissingSeedProfiles ? (
                  <Button
                    label={t('vectorSettings.seed.loadButton')}
                    icon="pi pi-database"
                    severity="secondary"
                    outlined
                    onClick={applySeedProfiles}
                  />
                ) : (
                  <Button
                    label={t('vectorSettings.seed.overwriteButton')}
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    onClick={overwriteSeedProfiles}
                  />
                )}
                <Button label={t('vectorSettings.profileDialog.addButton')} icon="pi pi-plus" onClick={openCreateProfileDialog} />                
                <Button
                  label={t('common.refresh')}
                  severity="secondary"
                  outlined
                  icon="pi pi-refresh"
                  disabled={loading || saving || applying || dryRunning}
                  onClick={() => {
                    setShowValidation(false);
                    void loadPageData();
                  }}
                />
                <Button
                  label={dryRunning ? t('vectorSettings.dryRunning') : t('vectorSettings.dryRunButton')}
                  severity="contrast"
                  outlined
                  icon="pi pi-check-square"
                  onClick={() => {
                    void handleDryRun();
                  }}
                  loading={dryRunning}
                  disabled={loading || saving || applying}
                />
                <Button
                  label={applying ? t('vectorSettings.applying') : t('vectorSettings.applyButton')}
                  severity="help"
                  icon="pi pi-play"
                  onClick={() => {
                    void handleApply();
                  }}
                  loading={applying}
                  disabled={loading || saving || dryRunning}
                />
                <Button
                  label={saving ? t('common.loading') : t('common.save')}
                  icon="pi pi-save"
                  onClick={() => {
                    void handleSave();
                  }}
                  loading={saving}
                  disabled={loading || applying || dryRunning}
                />
              </div>
            </div>
            <small className="text-color-secondary block mb-2">{t('vectorSettings.parserProfilesHelp')}</small>

            {profilesEmpty && <small className="p-error block mb-2">{t('vectorSettings.validation.profilesEmpty')}</small>}

            <CommonDataTable value={parserProfiles} loading={loading} className="admin-table p-datatable-sm" paginator rows={8}>
              <Column field="vendor" header={t('vectorSettings.profileTable.vendor')} />
              <Column field="ingestionMode" header={t('vectorSettings.profileTable.ingestionMode')} body={profileModeBody} />
              <Column field="matchIndicators" header={t('vectorSettings.profileTable.matchIndicators')} body={profileIndicatorsBody} />
              <Column field="deviceCodeRegex" header={t('vectorSettings.profileTable.deviceCodeRegex')} body={profileRegexBody} />
              <Column field="vrlScript" header={t('vectorSettings.profileTable.vrlScript')} body={profileVrlBody} />
              <Column field="enabled" header={t('vectorSettings.profileTable.enabled')} body={profileEnabledBody} />
              <Column
                header={t('common.actions')}
                body={(row: VectorParserProfile) => {
                  const index = parserProfiles.findIndex((item) => item.vendor === row.vendor && item.ingestionMode === row.ingestionMode && item.deviceCodeRegex === row.deviceCodeRegex);
                  return (
                    <div className="flex gap-2">
                      <Button buttonSize="dense" icon="pi pi-pencil" outlined onClick={() => openEditProfileDialog(row, index)} />
                      <Button buttonSize="dense" icon="pi pi-trash" severity="danger" outlined onClick={() => deleteProfile(index)} />
                    </div>
                  );
                }}
              />
            </CommonDataTable>
          </div>
        </div>
      </Card>
      <Card title={t('vectorSettings.applyResultsLabel')} className="admin-card monitoring-panel-card mt-4">
        <div className="col-12 mt-3">
          <CommonDataTable value={historyRows} loading={historyLoading} className="admin-table p-datatable-sm" paginator rows={8}>
            <Column
              field="attemptedAt"
              header={t('vectorApplyHistory.table.attemptedAt')}
              body={(row: VectorApplyHistoryItem) => formatDateTimeSeconds(row.attemptedAt)}
            />
            <Column field="configVersion" header={t('vectorApplyHistory.table.configVersion')} />
            <Column
              field="applyStatus"
              header={t('vectorApplyHistory.table.status')}
              body={(row: VectorApplyHistoryItem) => (
                <Tag value={row.applyStatus} severity={row.applyStatus === 'APPLIED' ? 'success' : 'danger'} />
              )}
            />
            <Column
              field="reloadSucceeded"
              header={t('vectorApplyHistory.table.reload')}
              body={(row: VectorApplyHistoryItem) => (
                <Tag
                  value={row.reloadSucceeded ? t('vectorApplyHistory.reloadSucceeded') : t('vectorApplyHistory.reloadNotSucceeded')}
                  severity={row.reloadSucceeded ? 'success' : 'warning'}
                />
              )}
            />
            <Column field="renderedBytes" header={t('vectorApplyHistory.table.size')} />
            <Column field="configPath" header={t('vectorApplyHistory.table.path')} />
            <Column field="message" header={t('vectorApplyHistory.table.message')} />
          </CommonDataTable>
        </div>

      </Card>
    </div>
  );
};

export default VectorSettingsPage;
