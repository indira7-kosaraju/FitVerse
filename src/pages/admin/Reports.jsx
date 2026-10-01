import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Skeleton from '../../components/common/Skeleton';
import useFetch from '../../hooks/useFetch';
import useChartColors from '../../hooks/useChartColors';
import { getPayments, getMemberships } from '../../api/membershipApi';
import { exportReport } from '../../api/adminApi';
import { getErrorMessage, toList } from '../../api/axios';
import { formatCurrency, formatNumber } from '../../utils/formatCurrency';
import { addDays, daysBetween, endOfDay, formatDate, startOfDay, toISODate } from '../../utils/formatDate';
import styles from '../../styles/Reports.module.css';

const REPORT_TYPES = [
  { value: 'payments', label: 'Payments' },
  { value: 'members', label: 'Members' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'classes', label: 'Classes' },
];

function presetRange(key) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (key) {
    case 'lastMonth':
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case 'last90':
      return { from: toISODate(addDays(today, -89)), to: toISODate(today) };
    case 'ytd':
      return { from: toISODate(new Date(y, 0, 1)), to: toISODate(today) };
    case 'thisMonth':
    default:
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(today) };
  }
}

const PRESETS = [
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'last90', label: 'Last 90 days' },
  { key: 'ytd', label: 'Year to date' },
];

/** Parse yyyy-mm-dd as a LOCAL date (new Date('yyyy-mm-dd') is UTC). */
const parseDay = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const paymentDate = (p) => p.paidAt || p.createdAt || p.date;
const membershipDate = (m) => m.startDate || m.createdAt;

function buildBuckets(fromStr, toStr, payments) {
  const from = parseDay(fromStr);
  const to = parseDay(toStr);
  const monthly = daysBetween(from, to) + 1 > 92;
  const buckets = new Map();

  if (monthly) {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= to) {
      buckets.set(monthKey(cursor), {
        key: monthKey(cursor),
        label: formatDate(cursor, { month: 'short', year: '2-digit' }),
        full: formatDate(cursor, { month: 'long', year: 'numeric' }),
        revenue: 0,
        count: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      const k = toISODate(d);
      buckets.set(k, {
        key: k,
        label: formatDate(d, { month: 'short', day: 'numeric' }),
        full: formatDate(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        revenue: 0,
        count: 0,
      });
    }
  }

  payments.forEach((p) => {
    const raw = paymentDate(p);
    if (!raw) return;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    const bucket = buckets.get(monthly ? monthKey(d) : toISODate(d));
    if (!bucket) return;
    bucket.revenue += Number(p.amount) || 0;
    bucket.count += 1;
  });

  return { monthly, rows: Array.from(buckets.values()) };
}

function RevenueTooltip({ active, payload, colors }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={colors.tooltipStyle} className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{row.full}</p>
      <p className={styles.tooltipValue}>{formatCurrency(row.revenue)}</p>
      <p className={styles.tooltipMeta}>
        {row.count} payment{row.count === 1 ? '' : 's'}
      </p>
    </div>
  );
}

function PlanTooltip({ active, payload, colors }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={colors.tooltipStyle} className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{row.name}</p>
      <p className={styles.tooltipValue}>
        {row.count} new membership{row.count === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default function Reports() {
  const [range, setRange] = useState(() => presetRange('thisMonth'));
  const [reportType, setReportType] = useState('payments');
  const [exporting, setExporting] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const colors = useChartColors();

  const rangeError = !range.from || !range.to ? 'Pick a start and end date' : range.from > range.to ? 'Start date must be before end date' : '';
  const valid = !rangeError;
  const fromISO = valid ? startOfDay(parseDay(range.from)).toISOString() : '';
  const toISO = valid ? endOfDay(parseDay(range.to)).toISOString() : '';

  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.from === range.from && r.to === range.to;
  })?.key;

  const payments = useFetch(
    async () => {
      const [paid, all] = await Promise.all([
        getPayments({ from: fromISO, to: toISO, status: 'paid', limit: 1000 }),
        getPayments({ from: fromISO, to: toISO, limit: 1000 }),
      ]);
      return { paid: toList(paid), all: toList(all) };
    },
    [fromISO, toISO],
    { immediate: valid }
  );

  const memberships = useFetch(
    () => getMemberships({ from: fromISO, to: toISO, limit: 1000 }),
    [fromISO, toISO],
    { immediate: valid }
  );

  const paidList = useMemo(
    () => (payments.data?.paid || []).filter((p) => !p.status || p.status === 'paid'),
    [payments.data]
  );

  const totals = useMemo(() => {
    const revenue = paidList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const all = payments.data?.all || [];
    const refunded = all.filter((p) => p.status === 'refunded').length;
    const failed = all.filter((p) => p.status === 'failed').length;
    return {
      revenue,
      count: paidList.length,
      avg: paidList.length ? revenue / paidList.length : 0,
      refunded,
      failed,
    };
  }, [paidList, payments.data]);

  const chart = useMemo(
    () => (valid ? buildBuckets(range.from, range.to, paidList) : { monthly: false, rows: [] }),
    [valid, range.from, range.to, paidList]
  );

  const byPlan = useMemo(() => {
    const counts = new Map();
    const fromT = valid ? new Date(fromISO).getTime() : -Infinity;
    const toT = valid ? new Date(toISO).getTime() : Infinity;
    toList(memberships.data).forEach((m) => {
      const raw = membershipDate(m);
      if (raw) {
        const t = new Date(raw).getTime();
        if (Number.isFinite(t) && (t < fromT || t > toT)) return;
      }
      const name = (m.plan && typeof m.plan === 'object' ? m.plan.name : null) || 'Unknown plan';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [memberships.data, valid, fromISO, toISO]);

  const totalNew = byPlan.reduce((s, r) => s + r.count, 0);

  const setField = (key, value) => setRange((r) => ({ ...r, [key]: value }));

  const handleExport = async () => {
    if (!valid) {
      toast.error(rangeError);
      return;
    }
    setExporting(true);
    try {
      const filename = await exportReport({ type: 'csv', report: reportType, from: fromISO, to: toISO });
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const rangeText = valid
    ? `${formatDate(parseDay(range.from))} – ${formatDate(parseDay(range.to))}`
    : 'Invalid range';
  const paymentsLoading = payments.loading && valid;
  const hasRevenue = paidList.length > 0;

  /* ---------- Revenue chart body ---------- */
  let revenueBody;
  if (payments.error) {
    revenueBody = <ErrorState message={payments.error} onRetry={payments.refetch} compact />;
  } else if (paymentsLoading && !payments.data) {
    revenueBody = <Skeleton height={280} radius={12} />;
  } else if (!hasRevenue) {
    revenueBody = (
      <EmptyState icon="receipt" title="No paid payments" message="Nothing was paid in this date range." compact />
    );
  } else {
    revenueBody = (
      <>
        <div
          className={styles.chart}
          role="img"
          aria-label={`Revenue ${chart.monthly ? 'per month' : 'per day'}, total ${formatCurrency(totals.revenue)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={colors.tickStyle}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={colors.tickStyle}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) => formatCurrency(v, { compact: true })}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<RevenueTooltip colors={colors} />}
              />
              <Bar dataKey="revenue" name="Revenue" fill={colors.series[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <button type="button" className={styles.linkBtn} onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
          {showTable ? 'Hide data table' : 'Show data table'}
        </button>
        {showTable && (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <caption className="sr-only">Revenue {chart.monthly ? 'per month' : 'per day'}</caption>
              <thead>
                <tr>
                  <th scope="col">{chart.monthly ? 'Month' : 'Day'}</th>
                  <th scope="col" className={styles.num}>Payments</th>
                  <th scope="col" className={styles.num}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {chart.rows
                  .filter((r) => r.count > 0)
                  .map((r) => (
                    <tr key={r.key}>
                      <th scope="row">{r.full}</th>
                      <td className={styles.num}>{r.count}</td>
                      <td className={styles.num}>{formatCurrency(r.revenue)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  /* ---------- Memberships by plan body ---------- */
  let planBody;
  if (memberships.error) {
    planBody = <ErrorState message={memberships.error} onRetry={memberships.refetch} compact />;
  } else if (memberships.loading && valid && !memberships.data) {
    planBody = <Skeleton height={20} count={4} />;
  } else if (!byPlan.length) {
    planBody = <EmptyState icon="users" title="No new memberships" message="No one joined in this date range." compact />;
  } else {
    planBody = (
      <>
        <div
          className={styles.planChart}
          style={{ height: Math.max(120, byPlan.length * 44 + 16) }}
          role="img"
          aria-label={`New memberships by plan: ${byPlan.map((r) => `${r.name} ${r.count}`).join(', ')}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byPlan} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={8}>
              <CartesianGrid stroke={colors.grid} horizontal={false} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={colors.tickStyle}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} content={<PlanTooltip colors={colors} />} />
              <Bar dataKey="count" name="New memberships" fill={colors.series[2]} radius={[0, 4, 4, 0]} maxBarSize={28}>
                <LabelList dataKey="count" position="right" style={{ fill: colors.text, fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className={styles.planList}>
          {byPlan.map((r) => (
            <li key={r.name}>
              <span>{r.name}</span>
              <span className={styles.planShare}>
                {r.count} · {Math.round((r.count / totalNew) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Admin" title="Reports" subtitle="Revenue, sign-ups and exports for any date range." />

      <section className={styles.rangeBar} aria-label="Date range">
        <div className={styles.presets} role="group" aria-label="Quick ranges">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`${styles.chip} ${activePreset === p.key ? styles.chipActive : ''}`}
              aria-pressed={activePreset === p.key}
              onClick={() => setRange(presetRange(p.key))}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className={styles.dates}>
          <Input
            label="From"
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={(e) => setField('from', e.target.value)}
            error={rangeError && range.from > range.to ? rangeError : !range.from ? 'Required' : undefined}
          />
          <Input
            label="To"
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={(e) => setField('to', e.target.value)}
            error={!range.to ? 'Required' : undefined}
          />
        </div>
      </section>

      <section className={styles.stats} aria-label="Totals">
        <StatCard
          label="Revenue"
          value={formatCurrency(totals.revenue)}
          icon="trendingUp"
          tone="primary"
          loading={paymentsLoading}
          hint={rangeText}
        />
        <StatCard label="Paid payments" value={formatNumber(totals.count)} icon="receipt" tone="info" loading={paymentsLoading} />
        <StatCard
          label="Average payment"
          value={formatCurrency(totals.avg)}
          icon="card"
          tone="success"
          loading={paymentsLoading}
        />
        <StatCard
          label="Refunded / failed"
          value={`${formatNumber(totals.refunded)} / ${formatNumber(totals.failed)}`}
          icon="alert"
          tone="accent"
          loading={paymentsLoading}
          hint="Payments needing attention"
        />
      </section>

      <div className={styles.charts}>
        <Card
          title="Revenue"
          subtitle={`${chart.monthly ? 'Per month' : 'Per day'} · paid payments`}
          className={styles.revenueCard}
        >
          {revenueBody}
        </Card>

        <Card title="New memberships" subtitle={valid ? `${formatNumber(totalNew)} by plan` : 'By plan'}>
          {planBody}
        </Card>
      </div>

      <Card
        title="Export"
        subtitle="Download a CSV for the selected date range."
        className={styles.exportCard}
      >
        <div className={styles.exportRow}>
          <Select
            label="Report"
            options={REPORT_TYPES}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          />
          <Button icon="download" loading={exporting} disabled={!valid} onClick={handleExport}>
            Download CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}
