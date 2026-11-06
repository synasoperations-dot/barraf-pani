'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/form';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { localDate } from '@/features/admin/board';
import { downloadText, toCsv } from '@/features/admin/links';
import { reportKpis } from '@/features/admin/report';
import { useStaff } from '@/features/admin/session';
import { api } from '@/lib/api';
import { OrderSource, type SalesReport } from '@/lib/contracts';
import { formatAmount } from '@/lib/format';
import { AdminPage, Panel } from './kit';

// Chart.js loads on this route only (§2.5).
const BarChart = dynamic(() => import('./ReportCharts').then((m) => m.BarChart), {
  ssr: false,
  loading: () => <Skeleton className="h-72" />,
});

/** Fixed colour slot per source (identity follows the entity). */
const SOURCE_COLOR: Record<OrderSource, number> = {
  website: 0,
  whatsapp: 1,
  phone: 2,
  walk_in: 3,
  foodpanda: 4,
};

function ChartCard({
  title,
  children,
  table,
}: {
  title: string;
  children: ReactNode;
  table: { head: string[]; rows: (string | number)[][] };
}) {
  const t = useTranslations('admin.reports');
  return (
    <Panel className="grid gap-3">
      <h2 className="font-sticker text-lg font-black">{title}</h2>
      {children}
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-bold">{t('table')}</summary>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b-2 border-ink">
                {table.head.map((h) => (
                  <th key={h} scope="col" className="py-1 text-start">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-grid-line">
                  {r.map((c, j) => (
                    <td key={j} className="py-1" dir={j ? 'ltr' : undefined}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Panel>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border-3 border-ink bg-white p-4 shadow-hard-sm">
      <p className="text-sm font-bold">{label}</p>
      <p className="font-price text-4xl leading-tight tracking-[0.02em]" dir="ltr">
        {value}
      </p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}

function Report({ r, canExport }: { r: SalesReport; canExport: boolean }) {
  const t = useTranslations('admin.reports');
  const ts = useTranslations();
  const k = reportKpis(r);
  const rs = (n: number) => ts('price.rs', { amount: formatAmount(n) });
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const days = [...new Set(r.bySourceByDay.map((x) => x.date))].sort();
  const sourceSeries = useMemo(
    () =>
      OrderSource.options.map((s) => ({
        label: ts(`source.${s}`),
        color: SOURCE_COLOR[s],
        data: days.map(
          (d) => r.bySourceByDay.find((x) => x.date === d && x.source === s)?.count ?? 0,
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r],
  );

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      [t('csv.section'), t('csv.key'), t('csv.count'), t('csv.total')],
      ...r.byDay.map((d) => ['day', d.date, d.orders, d.total]),
      ...r.bySource.map((s) => ['source', s.source, s.count, s.total]),
      ...r.byPaymentMethod.map((p) => ['payment', p.method, p.count, p.total]),
      ...r.byFulfilment.map((f) => ['fulfilment', f.fulfilment, f.count, f.total]),
      ...r.topItems.map((i) => ['item', i.name, i.qty, i.total]),
      ...r.byCategory.map((c) => ['category', c.name, c.qty, c.total]),
      ...r.byHour.map((h) => ['hour', h.hour, h.orders, '']),
    ];
    downloadText(`barraf-paani-sales-${r.from.slice(0, 10)}-${r.to.slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <div className="grid gap-5">
      {canExport && (
        <Button variant="ghost" size="lg" className="justify-self-end" onClick={exportCsv}>
          {t('export')}
        </Button>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label={t('kpi.orders')}
          value={String(r.orderCount)}
          sub={t('kpi.ofAll', { all: r.allOrders })}
        />
        <Kpi label={t('kpi.revenue')} value={rs(r.grossSales)} />
        <Kpi label={t('kpi.aov')} value={rs(r.averageOrder)} />
        <Kpi
          label={t('kpi.split')}
          value={`${pct(k.deliveryShare)} / ${pct(1 - k.deliveryShare)}`}
          sub={t('kpi.splitSub')}
        />
        <Kpi
          label={t('kpi.cancelRate')}
          value={pct(k.cancelRate)}
          sub={t('kpi.cancelSub', { cancelled: r.cancelledCount, rejected: r.rejectedCount })}
        />
        <Kpi label={t('kpi.autoRejected')} value={String(r.autoRejectedCount)} />
        <Kpi label={t('kpi.websiteShare')} value={pct(k.websiteShare)} sub={t('kpi.websiteSub')} />
        <Kpi label={t('kpi.bookings')} value={String(r.bookingsConfirmed)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          title={t('chart.bySource')}
          table={{
            head: [t('csv.key'), ...OrderSource.options.map((s) => ts(`source.${s}`))],
            rows: days.map((d, i) => [d, ...sourceSeries.map((s) => s.data[i]!)]),
          }}
        >
          <BarChart
            label={t('chart.bySource')}
            labels={days.map((d) => d.slice(5))}
            series={sourceSeries}
            stacked
          />
        </ChartCard>
        <ChartCard
          title={t('chart.revenueByDay')}
          table={{
            head: [t('csv.key'), t('csv.count'), t('csv.total')],
            rows: r.byDay.map((d) => [d.date, d.orders, formatAmount(d.total)]),
          }}
        >
          <BarChart
            label={t('chart.revenueByDay')}
            labels={r.byDay.map((d) => d.date.slice(5))}
            series={[{ label: t('kpi.revenue'), color: 0, data: r.byDay.map((d) => d.total) }]}
            line
          />
        </ChartCard>
        <ChartCard
          title={t('chart.byHour')}
          table={{
            head: [t('hour'), t('csv.count')],
            rows: r.byHour.map((h) => [`${h.hour}:00`, h.orders]),
          }}
        >
          <BarChart
            label={t('chart.byHour')}
            labels={r.byHour.map((h) => String(h.hour))}
            series={[{ label: t('kpi.orders'), color: 0, data: r.byHour.map((h) => h.orders) }]}
          />
        </ChartCard>
        <ChartCard
          title={t('chart.topItems')}
          table={{
            head: [t('item'), t('qty'), t('csv.total')],
            rows: r.topItems.map((i) => [i.name, i.qty, formatAmount(i.total)]),
          }}
        >
          <BarChart
            label={t('chart.topItems')}
            labels={r.topItems.map((i) => i.name)}
            series={[{ label: t('qty'), color: 1, data: r.topItems.map((i) => i.qty) }]}
            horizontal
          />
        </ChartCard>
        <ChartCard
          title={t('chart.categories')}
          table={{
            head: [t('category'), t('qty'), t('csv.total')],
            rows: r.byCategory.map((c) => [c.name, c.qty, formatAmount(c.total)]),
          }}
        >
          <BarChart
            label={t('chart.categories')}
            labels={r.byCategory.map((c) => c.name)}
            series={[{ label: t('csv.total'), color: 0, data: r.byCategory.map((c) => c.total) }]}
            horizontal
          />
        </ChartCard>
        <ChartCard
          title={t('chart.payments')}
          table={{
            head: [t('method'), t('csv.count'), t('csv.total')],
            rows: r.byPaymentMethod.map((p) => [
              ts(`admin.pay.${p.method}`),
              p.count,
              formatAmount(p.total),
            ]),
          }}
        >
          <BarChart
            label={t('chart.payments')}
            labels={r.byPaymentMethod.map((p) => ts(`admin.pay.${p.method}`))}
            series={[
              { label: t('kpi.orders'), color: 2, data: r.byPaymentMethod.map((p) => p.count) },
            ]}
            horizontal
          />
        </ChartCard>
      </div>
    </div>
  );
}

/** Reports (owner; manager view-only): KPIs + charts for a date range, CSV export for the owner. */
export function ReportsAdmin() {
  const t = useTranslations('admin.reports');
  const staff = useStaff('reports');
  const [from, setFrom] = useState(() => localDate(Date.now() - 13 * 86_400_000));
  const [to, setTo] = useState(() => localDate());
  const range = {
    from: new Date(`${from}T00:00:00+05:00`).toISOString(),
    to: new Date(`${to}T23:59:59+05:00`).toISOString(),
  };
  const report = useQuery({
    queryKey: ['admin', 'report', range],
    queryFn: () => api.admin.salesReport(range.from, range.to),
    enabled: from <= to,
  });
  return (
    <AdminPage title={t('title')}>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Input
          type="date"
          label={t('from')}
          value={from}
          max={to}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
        />
        <Input
          type="date"
          label={t('to')}
          value={to}
          min={from}
          onChange={(e) => e.target.value && setTo(e.target.value)}
        />
        {staff.data?.role === 'manager' && <p className="text-sm text-muted">{t('viewOnly')}</p>}
      </div>
      {report.isError ? (
        <ErrorState onRetry={() => void report.refetch()} />
      ) : !report.data ? (
        <Skeleton className="h-96 rounded-card" />
      ) : report.data.allOrders ? (
        <Report r={report.data} canExport={staff.data?.role === 'owner'} />
      ) : (
        <EmptyState title={t('empty')} body={t('emptyBody')} />
      )}
    </AdminPage>
  );
}
