import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Tabs from '../../components/common/Tabs';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import useFetch from '../../hooks/useFetch';
import useChartColors from '../../hooks/useChartColors';
import { getStats, getRevenue, getPeakHours } from '../../api/adminApi';
import { getMemberships } from '../../api/membershipApi';
import { toList } from '../../api/axios';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatCurrency';
import { formatShortDate } from '../../utils/formatDate';
import styles from '../../styles/AdminDashboard.module.css';

const RANGES = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '12m', label: '12 months' },
];

const MAX_SLICES = 5;

/* ---------- Normalisers ---------- */

const looksLikeDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}(-\d{2})?/.test(v);

function formatRevenueLabel(raw, range) {
  if (raw && typeof raw === 'object') {
    // Mongo group ids like { year, month, day }
    const { year, month, day } = raw;
    if (year && month) {
      const d = new Date(year, month - 1, day || 1);
      return range === '12m' ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : formatShortDate(d);
    }
    return String(Object.values(raw).join('-'));
  }
  if (looksLikeDate(raw)) {
    const parts = raw.split('-');
    if (parts.length === 2) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    const d = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
    if (!Number.isNaN(d.getTime())) {
      return range === '12m' ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : formatShortDate(d);
    }
  }
  return raw === undefined || raw === null ? '' : String(raw);
}

function normaliseRevenue(raw, range) {
  const list = Array.isArray(raw) ? raw : toList(raw?.points ?? raw);
  return list.map((p, i) => ({
    label: formatRevenueLabel(p.label ?? p.date ?? p._id ?? i + 1, range),
    amount: Number(p.amount ?? p.revenue ?? p.total ?? 0) || 0,
  }));
}

function hourLabel(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return String(h);
  const hour = ((n % 24) + 24) % 24;
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function normalisePeakHours(raw) {
  const list = Array.isArray(raw) ? raw : toList(raw);
  return list
    .map((p) => ({ hour: Number(p.hour ?? p._id ?? 0), count: Number(p.count ?? p.total ?? 0) || 0 }))
    .sort((a, b) => a.hour - b.hour)
    .map((p) => ({ ...p, label: hourLabel(p.hour) }));
}

function normaliseMix(rawMix) {
  const list = toList(rawMix)
    .map((m) => ({ name: m.name ?? m.plan?.name ?? m.plan ?? m._id ?? 'Unknown', count: Number(m.count ?? m.total ?? 0) || 0 }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count);
  // Never generate a 6th hue: fold the tail into "Other".
  if (list.length <= MAX_SLICES) return list;
  const head = list.slice(0, MAX_SLICES - 1);
  const rest = list.slice(MAX_SLICES - 1).reduce((s, m) => s + m.count, 0);
  return [...head, { name: 'Other', count: rest }];
}

async function fetchMix(stats) {
  if (Array.isArray(stats?.membershipMix) && stats.membershipMix.length) return normaliseMix(stats.membershipMix);
  const res = await getMemberships({ status: 'active', limit: 1000 });
  const counts = new Map();
  toList(res).forEach((m) => {
    const name = (typeof m.plan === 'object' && m.plan?.name) || 'Unknown plan';
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return normaliseMix(Array.from(counts, ([name, count]) => ({ name, count })));
}

/* ---------- Small pieces ---------- */

function ChartSkeleton() {
  return (
    <div className={styles.chartSkeleton} role="status">
      <span className="sr-only">Loading chart…</span>
      <Skeleton height={240} radius={12} />
    </div>
  );
}

function ChartTooltip({ active, payload, label, formatter, colors }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={colors.tooltipStyle} className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label ?? item.name}</p>
      <p className={styles.tooltipValue}>{formatter(item.value, item.payload)}</p>
    </div>
  );
}

/* ---------- Page ---------- */

export default function AdminDashboard() {
  const colors = useChartColors();
  const [range, setRange] = useState('30d');

  const statsQ = useFetch(() => getStats(), []);
  const revenueQ = useFetch(() => getRevenue(range), [range]);
  const peakQ = useFetch(() => getPeakHours(), []);
  // Mix may come embedded in stats; wait for stats to settle before falling back to memberships.
  const mixQ = useFetch(async () => (statsQ.loading ? null : fetchMix(statsQ.data)), [statsQ.loading, statsQ.data]);

  const stats = statsQ.data || {};
  const revenue = useMemo(() => normaliseRevenue(revenueQ.data, range), [revenueQ.data, range]);
  const peak = useMemo(() => normalisePeakHours(peakQ.data), [peakQ.data]);
  const mix = mixQ.data || [];
  const mixTotal = mix.reduce((s, m) => s + m.count, 0);

  const revenueTotal = revenue.reduce((s, p) => s + p.amount, 0);
  const revenuePeak = revenue.reduce((best, p) => (p.amount > (best?.amount ?? -1) ? p : best), null);
  const peakMax = peak.reduce((best, p) => (p.count > (best?.count ?? -1) ? p : best), null);
  const rangeLabel = RANGES.find((r) => r.id === range)?.label;

  const revenueSummary = revenue.length
    ? `Revenue over the last ${rangeLabel}: ${formatCurrency(revenueTotal)} total across ${revenue.length} periods. Highest was ${formatCurrency(
        revenuePeak?.amount
      )} on ${revenuePeak?.label}.`
    : 'No revenue data.';
  const mixSummary = mix.length
    ? `Active memberships by plan: ${mix
        .map((m) => `${m.name} ${m.count} (${Math.round((m.count / mixTotal) * 100)}%)`)
        .join(', ')}.`
    : 'No active memberships.';
  const peakSummary = peak.length
    ? `Check-ins by hour of day. Busiest hour is ${peakMax?.label} with ${formatNumber(peakMax?.count)} check-ins.`
    : 'No check-in data.';

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        subtitle="How the gym is performing right now."
        actions={
          <Button variant="secondary" icon="chart" to="/admin/reports">
            Reports
          </Button>
        }
      />

      {statsQ.error ? (
        <ErrorState message={statsQ.error} onRetry={statsQ.refetch} compact />
      ) : (
        <section className={styles.kpis} aria-label="Key metrics">
          <StatCard
            label="Active members"
            value={formatNumber(stats.activeMembers)}
            icon="users"
            tone="primary"
            loading={statsQ.loading}
          />
          <StatCard
            label="Revenue MTD"
            value={formatCurrency(stats.revenueMTD)}
            icon="card"
            tone="success"
            loading={statsQ.loading}
          />
          <StatCard
            label="Check-ins today"
            value={formatNumber(stats.checkInsToday)}
            icon="logIn"
            tone="info"
            loading={statsQ.loading}
          />
          <StatCard
            label="Churn rate"
            value={formatPercent(stats.churnRate)}
            icon="trendingDown"
            tone="accent"
            loading={statsQ.loading}
            hint="Last 30 days"
          />
          <StatCard
            label="New this month"
            value={formatNumber(stats.newMembersThisMonth)}
            icon="plus"
            tone="primary"
            loading={statsQ.loading}
          />
        </section>
      )}

      <div className={styles.grid}>
        <Card
          className={`${styles.chartCard} ${styles.wide}`}
          title="Revenue"
          subtitle={revenue.length && !revenueQ.loading ? `${formatCurrency(revenueTotal)} in the last ${rangeLabel}` : 'Collected payments'}
          actions={<Tabs tabs={RANGES} value={range} onChange={setRange} label="Revenue range" />}
        >
          {revenueQ.loading ? (
            <ChartSkeleton />
          ) : revenueQ.error ? (
            <ErrorState message={revenueQ.error} onRetry={revenueQ.refetch} compact />
          ) : revenue.length === 0 ? (
            <EmptyState icon="chart" title="No revenue yet" message="Payments in this period will show up here." compact />
          ) : (
            <figure className={styles.figure} role="img" aria-label={revenueSummary}>
              <div className={styles.chart} aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.series[0]} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={colors.series[0]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={colors.tickStyle}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={16}
                    />
                    <YAxis
                      tick={colors.tickStyle}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(v) => formatCurrency(v, { compact: true })}
                    />
                    <Tooltip
                      cursor={{ stroke: colors.axis, strokeDasharray: '3 3' }}
                      content={<ChartTooltip colors={colors} formatter={(v) => formatCurrency(v)} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Revenue"
                      stroke={colors.series[0]}
                      strokeWidth={2}
                      fill="url(#revenueFill)"
                      activeDot={{ r: 5, stroke: colors.tooltipBg, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="sr-only">{revenueSummary}</figcaption>
            </figure>
          )}
        </Card>

        <Card className={styles.chartCard} title="Membership mix" subtitle="Active memberships by plan">
          {mixQ.loading || statsQ.loading ? (
            <ChartSkeleton />
          ) : mixQ.error ? (
            <ErrorState message={mixQ.error} onRetry={mixQ.refetch} compact />
          ) : mix.length === 0 ? (
            <EmptyState icon="layers" title="No active memberships" message="Plan distribution appears once members subscribe." compact />
          ) : (
            <figure className={styles.figure} role="img" aria-label={mixSummary}>
              <div className={styles.donutWrap} aria-hidden="true">
                <div className={styles.donut}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={
                          <ChartTooltip
                            colors={colors}
                            formatter={(v) => `${formatNumber(v)} members · ${Math.round((v / mixTotal) * 100)}%`}
                          />
                        }
                      />
                      <Pie
                        data={mix}
                        dataKey="count"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="92%"
                        paddingAngle={mix.length > 1 ? 2 : 0}
                        stroke={colors.tooltipBg}
                        strokeWidth={2}
                        cornerRadius={4}
                      >
                        {mix.map((m, i) => (
                          <Cell key={m.name} fill={colors.series[i % colors.series.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.donutCenter}>
                    <span className={styles.donutValue}>{formatNumber(mixTotal)}</span>
                    <span className={styles.donutLabel}>active</span>
                  </div>
                </div>
              </div>
              <ul className={styles.legend}>
                {mix.map((m, i) => (
                  <li key={m.name} className={styles.legendItem}>
                    <span
                      className={styles.swatch}
                      style={{ background: colors.series[i % colors.series.length] }}
                      aria-hidden="true"
                    />
                    <span className={styles.legendName}>{m.name}</span>
                    <span className={styles.legendCount}>{formatNumber(m.count)}</span>
                    <span className={styles.legendPct}>{Math.round((m.count / mixTotal) * 100)}%</span>
                  </li>
                ))}
              </ul>
              <figcaption className="sr-only">{mixSummary}</figcaption>
            </figure>
          )}
        </Card>

        <Card
          className={styles.chartCard}
          title="Peak hours"
          subtitle={peakMax && !peakQ.loading ? `Busiest at ${peakMax.label}` : 'Check-ins by hour of day'}
        >
          {peakQ.loading ? (
            <ChartSkeleton />
          ) : peakQ.error ? (
            <ErrorState message={peakQ.error} onRetry={peakQ.refetch} compact />
          ) : peak.length === 0 ? (
            <EmptyState icon="clock" title="No check-ins yet" message="Hourly traffic will appear after members check in." compact />
          ) : (
            <figure className={styles.figure} role="img" aria-label={peakSummary}>
              <div className={styles.chart} aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peak} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
                    <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={colors.tickStyle} axisLine={false} tickLine={false} minTickGap={8} />
                    <YAxis tick={colors.tickStyle} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: colors.grid, opacity: 0.4 }}
                      content={<ChartTooltip colors={colors} formatter={(v) => `${formatNumber(v)} check-ins`} />}
                    />
                    <Bar dataKey="count" name="Check-ins" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {peak.map((p) => (
                        <Cell
                          key={p.hour}
                          fill={p === peakMax ? colors.series[1] : colors.series[0]}
                          fillOpacity={p === peakMax ? 1 : 0.55}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className={styles.chartNote}>
                <span className={styles.swatch} style={{ background: colors.series[1] }} aria-hidden="true" />
                Peak: <strong>{peakMax?.label}</strong> · {formatNumber(peakMax?.count)} check-ins
              </p>
              <figcaption className="sr-only">{peakSummary}</figcaption>
            </figure>
          )}
        </Card>
      </div>
    </div>
  );
}
