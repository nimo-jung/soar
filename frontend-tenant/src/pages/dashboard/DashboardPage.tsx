import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { ProgressBar } from 'primereact/progressbar';
import { Tag } from 'primereact/tag';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();

  const metrics = [
    { icon: 'pi pi-shield', title: t('dashboard.metrics.threatScore'), value: '89', unit: '/100', graphClass: 'graph-a' },
    { icon: 'pi pi-wave-pulse', title: t('dashboard.metrics.eventsPerSecond'), value: '4.2K', unit: 'EPS', graphClass: 'graph-b' },
    { icon: 'pi pi-server', title: t('dashboard.metrics.collectorHealth'), value: '98%', unit: '', graphClass: 'graph-c' },
    { icon: 'pi pi-sitemap', title: t('dashboard.metrics.playbookSuccess'), value: '94%', unit: '', graphClass: 'graph-d' },
  ];

  const timeline = [
    {
      icon: 'pi pi-bolt',
      title: t('dashboard.timeline.items.0.title'),
      detail: t('dashboard.timeline.items.0.detail'),
      time: '2m',
      severity: 'danger' as const,
    },
    {
      icon: 'pi pi-send',
      title: t('dashboard.timeline.items.1.title'),
      detail: t('dashboard.timeline.items.1.detail'),
      time: '8m',
      severity: 'warning' as const,
    },
    {
      icon: 'pi pi-check-circle',
      title: t('dashboard.timeline.items.2.title'),
      detail: t('dashboard.timeline.items.2.detail'),
      time: '17m',
      severity: 'success' as const,
    },
  ];

  return (
    <div className="tenant-page">
      <div className="page-header">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <div className="tenant-actions-row">
          <Button icon="pi pi-sync" label={t('dashboard.actions.refresh')} outlined />
          <Button className="tenant-primary-action" icon="pi pi-plus" label={t('dashboard.actions.newPlaybook')} />
        </div>
      </div>

      <div className="grid">
        {metrics.map((metric) => (
          <div key={metric.title} className="col-12 md:col-6 xl:col-3">
            <Card className="tenant-card dashboard-stat-card h-full p-0">
              <div className="flex align-items-center justify-content-between mb-3">
                <i className={`${metric.icon} text-xl text-cyan-300`} />
                <Tag value={t('dashboard.live')} severity="info" rounded />
              </div>
              <div className="text-500 text-sm mb-2">{metric.title}</div>
              <div className="flex align-items-end gap-2">
                <span className="text-4xl font-semibold text-0">{metric.value}</span>
                {metric.unit && <span className="text-500 mb-2">{metric.unit}</span>}
              </div>
              <div className={`dashboard-stat-graphic ${metric.graphClass}`} />
            </Card>
          </div>
        ))}
      </div>

      <div className="grid">
        <div className="col-12 xl:col-7">
          <Card className="tenant-card dashboard-surface-card h-full" title={t('dashboard.readiness.title')}>
            <div className="flex flex-column gap-4">
              <div>
                <div className="flex align-items-center justify-content-between mb-2">
                  <span className="text-sm text-300">{t('dashboard.readiness.threatModel')}</span>
                  <span className="text-sm text-0 font-semibold">96%</span>
                </div>
                <ProgressBar value={96} showValue={false} style={{ height: '0.55rem' }} />
              </div>
              <div>
                <div className="flex align-items-center justify-content-between mb-2">
                  <span className="text-sm text-300">{t('dashboard.readiness.pipelineStability')}</span>
                  <span className="text-sm text-0 font-semibold">91%</span>
                </div>
                <ProgressBar value={91} showValue={false} style={{ height: '0.55rem' }} />
              </div>
              <div>
                <div className="flex align-items-center justify-content-between mb-2">
                  <span className="text-sm text-300">{t('dashboard.readiness.autoResponse')}</span>
                  <span className="text-sm text-0 font-semibold">87%</span>
                </div>
                <ProgressBar value={87} showValue={false} style={{ height: '0.55rem' }} />
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 xl:col-5">
          <Card className="tenant-card dashboard-surface-card h-full" title={t('dashboard.timeline.title')}>
            <ul className="list-none p-0 m-0 flex flex-column gap-3">
              {timeline.map((item, idx) => (
                <li key={item.title} className="flex gap-3 dashboard-timeline-item">
                  <div className="flex flex-column align-items-center">
                    <Tag icon={item.icon} severity={item.severity} rounded />
                    {idx !== timeline.length - 1 && <Divider layout="vertical" className="my-2" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex align-items-center justify-content-between mb-1">
                      <span className="font-semibold text-sm text-0">{item.title}</span>
                      <span className="text-xs text-500">{item.time}</span>
                    </div>
                    <p className="m-0 text-sm text-400 line-height-3">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
