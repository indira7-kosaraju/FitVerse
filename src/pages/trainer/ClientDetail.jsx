import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import Tabs from '../../components/common/Tabs';
import Card from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import Skeleton, { SkeletonGrid } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import PlanBuilder from '../../components/trainer/PlanBuilder';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import useChartColors from '../../hooks/useChartColors';
import { getTrainerClients } from '../../api/trainerApi';
import { getClientProgress } from '../../api/progressApi';
import { getClientPlan } from '../../api/workoutApi';
import { toList } from '../../api/axios';
import { addDays, formatDate, formatShortDate, startOfDay } from '../../utils/formatDate';
import { formatNumber } from '../../utils/formatCurrency';
import styles from '../../styles/ClientDetail.module.css';

const RANGES = [
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '3 months', days: 90 },
  { id: '180', label: '6 months', days: 180 },
  { id: '365', label: '1 year', days: 365 },
  { id: 'all', label: 'All time', days: null },
];

const MEASUREMENTS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'arms', label: 'Arms' },
  { key: 'thighs', label: 'Thighs' },
];

const num = (v) => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n;
};

/* ---------------- Progress tab ---------------- */

function TrendChart({ title, data, dataKey, unit, color, colors }) {
  const points = data.filter((d) => d[dataKey] !== null);
  return (
    <Card title={title} subtitle={points.length ? `${points.length} check-ins` : undefined} className={styles.chartCard}>
      {points.length < 1 ? (
        <EmptyState icon="chart" title={`No ${title.toLowerCase()} data`} message="Nothing logged in this range." compact />
      ) : (
        <div className={styles.chart} role="img" aria-label={`${title} trend chart`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={colors.tickStyle}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                minTickGap={16}
              />
              <YAxis
                tick={colors.tickStyle}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                width={48}
                unit={unit === '%' ? '%' : ''}
              />
              <Tooltip
                contentStyle={colors.tooltipStyle}
                labelStyle={{ color: colors.text, fontWeight: 600 }}
                itemStyle={{ color: colors.text }}
                cursor={{ stroke: colors.grid }}
                formatter={(value) => [`${formatNumber(value, { maximumFractionDigits: 1 })} ${unit}`, title]}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function ProgressTab({ clientId }) {
  const [range, setRange] = useState('90');
  const colors = useChartColors();

  const { data, loading, error, refetch } = useFetch(() => {
    const preset = RANGES.find((r) => r.id === range);
    const params = { limit: 500 };
    if (preset?.days) {
      params.from = startOfDay(addDays(new Date(), -preset.days)).toISOString();
      params.to = new Date().toISOString();
    }
    return getClientProgress(clientId, params);
  }, [clientId, range]);

  const entries = useMemo(
    () =>
      toList(data)
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data]
  );

  const chartData = useMemo(
    () =>
      entries.map((e) => ({
        label: formatShortDate(e.date),
        weightKg: num(e.weightKg),
        bodyFatPct: num(e.bodyFatPct),
      })),
    [entries]
  );

  const latestWithMeasurements = useMemo(
    () =>
      [...entries]
        .reverse()
        .find((e) => e.measurements && MEASUREMENTS.some((m) => num(e.measurements[m.key]) !== null)),
    [entries]
  );

  const photos = useMemo(
    () =>
      [...entries]
        .reverse()
        .flatMap((e) => (Array.isArray(e.photoUrls) ? e.photoUrls.map((url, i) => ({ url, date: e.date, key: `${e._id}-${i}` })) : []))
        .slice(0, 12),
    [entries]
  );

  const first = entries.find((e) => num(e.weightKg) !== null);
  const last = [...entries].reverse().find((e) => num(e.weightKg) !== null);
  const weightDelta = first && last && first !== last ? num(last.weightKg) - num(first.weightKg) : null;

  return (
    <div className={styles.tabBody}>
      <div className={styles.rangeBar} role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`${styles.rangeChip} ${range === r.id ? styles.rangeActive : ''}`}
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonGrid count={2} lines={6} minWidth={300} label="Loading progress…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No progress logged"
          message="This client hasn't logged any check-ins in the selected range."
        />
      ) : (
        <>
          <ul className={styles.summary}>
            <li>
              <span className={styles.summaryLabel}>Latest weight</span>
              <span className={styles.summaryValue}>
                {last ? `${formatNumber(last.weightKg, { maximumFractionDigits: 1 })} kg` : '—'}
              </span>
            </li>
            <li>
              <span className={styles.summaryLabel}>Change in range</span>
              <span
                className={`${styles.summaryValue} ${
                  weightDelta === null ? '' : weightDelta <= 0 ? styles.down : styles.up
                }`}
              >
                {weightDelta === null
                  ? '—'
                  : `${weightDelta > 0 ? '+' : ''}${formatNumber(weightDelta, { maximumFractionDigits: 1 })} kg`}
              </span>
            </li>
            <li>
              <span className={styles.summaryLabel}>Check-ins</span>
              <span className={styles.summaryValue}>{entries.length}</span>
            </li>
          </ul>

          <div className={styles.charts}>
            <TrendChart title="Weight" data={chartData} dataKey="weightKg" unit="kg" color={colors.series[0]} colors={colors} />
            <TrendChart
              title="Body fat"
              data={chartData}
              dataKey="bodyFatPct"
              unit="%"
              color={colors.series[1]}
              colors={colors}
            />
          </div>

          <div className={styles.lower}>
            <Card
              title="Latest measurements"
              subtitle={latestWithMeasurements ? formatDate(latestWithMeasurements.date) : undefined}
            >
              {latestWithMeasurements ? (
                <dl className={styles.measurements}>
                  {MEASUREMENTS.map((m) => {
                    const v = num(latestWithMeasurements.measurements[m.key]);
                    return (
                      <div key={m.key} className={styles.measure}>
                        <dt>{m.label}</dt>
                        <dd>{v === null ? '—' : `${formatNumber(v, { maximumFractionDigits: 1 })} cm`}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <EmptyState icon="target" title="No measurements" message="No body measurements in this range." compact />
              )}
            </Card>

            <Card title="Progress photos" subtitle={photos.length ? `${photos.length} most recent` : undefined}>
              {photos.length === 0 ? (
                <EmptyState icon="camera" title="No photos" message="No progress photos in this range." compact />
              ) : (
                <ul className={styles.photos}>
                  {photos.map((p) => (
                    <li key={p.key}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.photo}>
                        <img src={p.url} alt={`Progress photo from ${formatDate(p.date)}`} loading="lazy" />
                        <span className={styles.photoDate}>{formatShortDate(p.date)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Workout plan tab ---------------- */

function PlanTab({ clientId, clientName }) {
  const { data: plan, loading, error, refetch, setData } = useFetch(() => getClientPlan(clientId), [clientId]);
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <div className={styles.tabBody} role="status" aria-live="polite">
        <span className="sr-only">Loading workout plan…</span>
        <Skeleton height={44} width="60%" />
        <SkeletonGrid count={2} lines={5} minWidth={320} label="" />
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const hasPlan = plan && typeof plan === 'object' && (plan._id || Array.isArray(plan.weeks));

  if (!hasPlan && !creating) {
    return (
      <EmptyState
        icon="clipboard"
        title="No workout plan yet"
        message={`Build a structured program for ${clientName || 'this client'} — weeks, days and exercises.`}
        action={
          <Button icon="plus" onClick={() => setCreating(true)}>
            Create plan
          </Button>
        }
      />
    );
  }

  return (
    <div className={styles.tabBody}>
      <PlanBuilder
        key={hasPlan ? plan._id || 'plan' : 'new'}
        plan={hasPlan ? plan : null}
        memberId={clientId}
        onSaved={(saved) => {
          setCreating(false);
          setData(saved);
        }}
        onCancel={!hasPlan ? () => setCreating(false) : undefined}
      />
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function ClientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState('progress');

  const { data, loading, error, refetch } = useFetch(() => getTrainerClients(user?._id, { limit: 500 }), [user?._id]);
  const client = useMemo(() => toList(data).find((c) => String(c._id) === String(id)), [data, id]);
  const status = client?.membership && typeof client.membership === 'object' ? client.membership.status : client?.membershipStatus;

  const back = { to: '/trainer/clients', label: 'All clients' };

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="Client" back={back} />
        <div className={styles.profileSkeleton} role="status" aria-live="polite">
          <span className="sr-only">Loading client…</span>
          <Skeleton circle height={72} />
          <Skeleton count={3} height={14} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <PageHeader title="Client" back={back} />
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className={styles.page}>
        <PageHeader title="Client not found" back={back} />
        <EmptyState
          icon="users"
          title="Client not found"
          message="This member isn't assigned to you, or the link is out of date."
          action={
            <Button variant="secondary" to="/trainer/clients" icon="chevronLeft">
              Back to clients
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={client.name} eyebrow="Client" back={back} />

      <section className={styles.profile} aria-label="Client details">
        <Avatar src={client.avatarUrl} name={client.name} size={72} ring />
        <div className={styles.profileText}>
          <div className={styles.profileTop}>
            <h2 className={styles.profileName}>{client.name}</h2>
            {status && <Badge status={status} dot />}
          </div>
          <ul className={styles.contact}>
            {client.email && (
              <li>
                <Icon name="mail" size={16} />
                <a href={`mailto:${client.email}`}>{client.email}</a>
              </li>
            )}
            {client.phone && (
              <li>
                <Icon name="phone" size={16} />
                <a href={`tel:${client.phone}`}>{client.phone}</a>
              </li>
            )}
            {client.membership?.plan?.name && (
              <li>
                <Icon name="card" size={16} />
                <span>{client.membership.plan.name}</span>
              </li>
            )}
          </ul>
          {client.emergencyContact?.name && (
            <p className={styles.emergency}>
              <Icon name="shield" size={14} /> Emergency: {client.emergencyContact.name}
              {client.emergencyContact.relation ? ` (${client.emergencyContact.relation})` : ''}
              {client.emergencyContact.phone ? ` · ${client.emergencyContact.phone}` : ''}
            </p>
          )}
        </div>
      </section>

      <Tabs
        label="Client sections"
        idPrefix="client-detail"
        tabs={[
          { id: 'progress', label: 'Progress' },
          { id: 'plan', label: 'Workout plan' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div role="tabpanel" id={`client-detail-panel-${tab}`} aria-labelledby={`client-detail-tab-${tab}`}>
        {tab === 'progress' ? (
          <ProgressTab clientId={client._id} />
        ) : (
          <PlanTab clientId={client._id} clientName={client.name} />
        )}
      </div>
    </div>
  );
}
