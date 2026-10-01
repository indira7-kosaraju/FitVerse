import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatCard from '../../components/common/StatCard';
import Table from '../../components/common/Table';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import FileUpload from '../../components/common/FileUpload';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Skeleton from '../../components/common/Skeleton';
import Icon from '../../components/common/Icon';
import ProgressForm from '../../components/forms/ProgressForm';
import useFetch from '../../hooks/useFetch';
import useChartColors from '../../hooks/useChartColors';
import { createProgress, deleteProgress, getMyProgress, uploadProgressPhotos } from '../../api/progressApi';
import { getErrorMessage, getFieldErrors, toList } from '../../api/axios';
import { addDays, endOfDay, formatDate, formatShortDate, startOfDay, toISODate } from '../../utils/formatDate';
import { formatNumber } from '../../utils/formatCurrency';
import styles from '../../styles/Progress.module.css';

const PRESETS = [
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
  { value: '6m', label: '6 months', days: 182 },
  { value: '1y', label: '1 year', days: 365 },
  { value: 'all', label: 'All', days: null },
];

/** Parses a yyyy-mm-dd input value as a local date. */
const parseLocalDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const num = (v) => (v === undefined || v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const fmt = (v, unit, digits = 1) => (num(v) === null ? '—' : `${formatNumber(num(v), { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`);

function ChartTooltip({ active, payload, label, unit, name, style }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...style, padding: '8px 12px' }}>
      <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 2 }}>{formatDate(label)}</div>
      <div style={{ fontWeight: 600 }}>
        {name}: {formatNumber(payload[0].value, { maximumFractionDigits: 1 })} {unit}
      </div>
    </div>
  );
}

function MetricChart({ data, dataKey, unit, name, color, colors }) {
  return (
    <div className={styles.chartBox}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => formatShortDate(v)}
            tick={colors.tickStyle}
            stroke={colors.grid}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={colors.tickStyle}
            stroke={colors.grid}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[(min) => Math.floor(min - 1), (max) => Math.ceil(max + 1)]}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: colors.axis, strokeDasharray: '4 4' }}
            content={<ChartTooltip unit={unit} name={name} style={colors.tooltipStyle} />}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={name}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color, stroke: colors.tooltipBg, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: color, stroke: colors.tooltipBg, strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Progress() {
  const colors = useChartColors();
  const [preset, setPreset] = useState('90d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(() => {
    if (preset === 'custom') {
      const f = parseLocalDate(customFrom);
      const t = parseLocalDate(customTo);
      return {
        from: f ? startOfDay(f).toISOString() : undefined,
        to: t ? endOfDay(t).toISOString() : undefined,
      };
    }
    const p = PRESETS.find((x) => x.value === preset);
    if (!p?.days) return { from: undefined, to: undefined };
    return { from: startOfDay(addDays(new Date(), -p.days)).toISOString(), to: endOfDay(new Date()).toISOString() };
  }, [preset, customFrom, customTo]);

  const { data, loading, error, refetch } = useFetch(
    () => getMyProgress({ from: range.from, to: range.to, limit: 500, sort: 'date' }),
    [range.from, range.to]
  );

  const entries = useMemo(
    () =>
      toList(data)
        .filter((e) => e && e.date)
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data]
  );
  const entriesDesc = useMemo(() => entries.slice().reverse(), [entries]);

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    const withWeight = entries.filter((e) => num(e.weightKg) !== null);
    const first = withWeight[0];
    const last = withWeight[withWeight.length - 1];
    const latestFat = [...entries].reverse().find((e) => num(e.bodyFatPct) !== null);
    const change = first && last ? num(last.weightKg) - num(first.weightKg) : null;
    const changePct = change !== null && num(first.weightKg) ? (change / num(first.weightKg)) * 100 : null;
    return {
      current: last ? num(last.weightKg) : null,
      currentDate: last?.date,
      change,
      changePct,
      bodyFat: latestFat ? num(latestFat.bodyFatPct) : null,
      bodyFatDate: latestFat?.date,
      count: entries.length,
    };
  }, [entries]);

  const weightData = useMemo(
    () => entries.filter((e) => num(e.weightKg) !== null).map((e) => ({ ts: new Date(e.date).getTime(), weightKg: num(e.weightKg) })),
    [entries]
  );
  const fatData = useMemo(
    () =>
      entries.filter((e) => num(e.bodyFatPct) !== null).map((e) => ({ ts: new Date(e.date).getTime(), bodyFatPct: num(e.bodyFatPct) })),
    [entries]
  );

  /* ---------- Add entry ---------- */
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [serverErrors, setServerErrors] = useState(null);

  const handleCreate = async (payload) => {
    setCreating(true);
    setServerErrors(null);
    try {
      await createProgress(payload);
      toast.success('Progress entry saved');
      setAddOpen(false);
      refetch();
    } catch (err) {
      setServerErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  /* ---------- Delete ---------- */
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProgress(toDelete._id);
      toast.success('Entry deleted');
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- Photos ---------- */
  const photoGroups = useMemo(
    () =>
      entriesDesc
        .filter((e) => Array.isArray(e.photoUrls) && e.photoUrls.length > 0)
        .map((e) => ({ id: e._id, date: e.date, photos: e.photoUrls.filter(Boolean) })),
    [entriesDesc]
  );
  const flatPhotos = useMemo(
    () => photoGroups.flatMap((g) => g.photos.map((url) => ({ url, date: g.date }))),
    [photoGroups]
  );

  const [lightbox, setLightbox] = useState(null); // index into flatPhotos
  const showPrev = useCallback(
    () => setLightbox((i) => (i === null ? i : (i - 1 + flatPhotos.length) % flatPhotos.length)),
    [flatPhotos.length]
  );
  const showNext = useCallback(
    () => setLightbox((i) => (i === null ? i : (i + 1) % flatPhotos.length)),
    [flatPhotos.length]
  );

  useEffect(() => {
    if (lightbox === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, showPrev, showNext]);

  useEffect(() => {
    if (lightbox !== null && lightbox >= flatPhotos.length) setLightbox(flatPhotos.length ? 0 : null);
  }, [lightbox, flatPhotos.length]);

  const [uploadEntryId, setUploadEntryId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const latest = entriesDesc[0]?._id || '';
    setUploadEntryId((cur) => (cur && entriesDesc.some((e) => e._id === cur) ? cur : latest));
  }, [entriesDesc]);

  const handleUpload = async (files) => {
    if (!uploadEntryId) {
      toast.error('Choose an entry to attach the photos to');
      throw new Error('No entry selected');
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadProgressPhotos(uploadEntryId, files, (evt) => {
        if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    } finally {
      setUploading(false);
    }
  };

  /* ---------- Table ---------- */
  const columns = [
    { key: 'date', header: 'Date', render: (r) => <strong>{formatDate(r.date)}</strong> },
    { key: 'weightKg', header: 'Weight', align: 'right', render: (r) => fmt(r.weightKg, 'kg') },
    { key: 'chest', header: 'Chest', align: 'right', hideOnMobile: true, render: (r) => fmt(r.measurements?.chest, 'cm') },
    { key: 'waist', header: 'Waist', align: 'right', render: (r) => fmt(r.measurements?.waist, 'cm') },
    { key: 'hips', header: 'Hips', align: 'right', hideOnMobile: true, render: (r) => fmt(r.measurements?.hips, 'cm') },
    { key: 'arms', header: 'Arms', align: 'right', hideOnMobile: true, render: (r) => fmt(r.measurements?.arms, 'cm') },
    { key: 'thighs', header: 'Thighs', align: 'right', hideOnMobile: true, render: (r) => fmt(r.measurements?.thighs, 'cm') },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          icon="trash"
          iconOnly
          aria-label={`Delete entry from ${formatDate(r.date)}`}
          onClick={() => setToDelete(r)}
        />
      ),
    },
  ];

  const changeLabel =
    stats.change === null
      ? '—'
      : `${stats.change > 0 ? '+' : stats.change < 0 ? '−' : ''}${formatNumber(Math.abs(stats.change), { maximumFractionDigits: 1 })} kg`;

  const current = lightbox !== null ? flatPhotos[lightbox] : null;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Track your journey"
        title="Progress"
        subtitle="Log your weight, body fat and measurements, and watch the trend lines move."
        actions={
          <Button icon="plus" onClick={() => { setServerErrors(null); setAddOpen(true); }}>
            Add entry
          </Button>
        }
      />

      {/* ---------- Range filter ---------- */}
      <section className={styles.filters} aria-label="Date range">
        <div className={styles.presets} role="group" aria-label="Range presets">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`${styles.preset} ${preset === p.value ? styles.presetActive : ''}`}
              aria-pressed={preset === p.value}
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className={styles.custom}>
          <Input
            label="From"
            type="date"
            value={customFrom}
            max={customTo || toISODate(new Date())}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              setPreset('custom');
            }}
          />
          <Input
            label="To"
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setPreset('custom');
            }}
          />
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          {/* ---------- Stats ---------- */}
          <section className={styles.stats} aria-label="Summary">
            <StatCard
              label="Current weight"
              icon="scale"
              loading={loading}
              value={stats.current !== null ? fmt(stats.current, 'kg') : '—'}
              hint={stats.currentDate ? `Logged ${formatShortDate(stats.currentDate)}` : 'No entries yet'}
            />
            <StatCard
              label="Change over range"
              icon={stats.change !== null && stats.change < 0 ? 'trendingDown' : 'trendingUp'}
              tone="accent"
              loading={loading}
              value={changeLabel}
              delta={stats.changePct !== null ? stats.changePct : undefined}
              deltaLabel="vs first entry in range"
              hint={stats.change === null ? 'Need at least one entry' : undefined}
            />
            <StatCard
              label="Body fat"
              icon="target"
              tone="info"
              loading={loading}
              value={stats.bodyFat !== null ? `${formatNumber(stats.bodyFat, { maximumFractionDigits: 1 })}%` : '—'}
              hint={stats.bodyFatDate ? `Logged ${formatShortDate(stats.bodyFatDate)}` : 'Not logged yet'}
            />
            <StatCard
              label="Entries"
              icon="list"
              tone="success"
              loading={loading}
              value={formatNumber(stats.count)}
              hint={preset === 'all' ? 'All time' : 'In selected range'}
            />
          </section>

          {/* ---------- Charts ---------- */}
          <div className={styles.charts}>
            <Card title="Weight" subtitle="Kilograms over time">
              {loading ? (
                <Skeleton height={260} radius={12} />
              ) : weightData.length < 1 ? (
                <EmptyState icon="chart" title="No weight data" message="Add an entry to start your weight trend." compact />
              ) : (
                <MetricChart data={weightData} dataKey="weightKg" unit="kg" name="Weight" color={colors.series[0]} colors={colors} />
              )}
            </Card>
            <Card title="Body fat" subtitle="Percentage over time">
              {loading ? (
                <Skeleton height={260} radius={12} />
              ) : fatData.length < 1 ? (
                <EmptyState icon="chart" title="No body fat data" message="Log body fat % with your entries to see this trend." compact />
              ) : (
                <MetricChart data={fatData} dataKey="bodyFatPct" unit="%" name="Body fat" color={colors.series[1]} colors={colors} />
              )}
            </Card>
          </div>

          {/* ---------- Measurements ---------- */}
          <Card title="Measurements" subtitle="Every entry in the selected range, newest first">
            <Table
              columns={columns}
              data={entriesDesc}
              loading={loading}
              caption="Progress measurements"
              emptyTitle="No entries in this range"
              emptyMessage="Add your first entry or widen the date range."
            />
          </Card>

          {/* ---------- Photos ---------- */}
          <Card title="Progress photos" subtitle="Visual check-ins grouped by entry date">
            <div className={styles.photoLayout}>
              <div className={styles.uploadBox}>
                <h3 className={styles.subheading}>
                  <Icon name="camera" size={18} /> Upload photos
                </h3>
                {entriesDesc.length === 0 && !loading ? (
                  <p className={styles.muted}>Add a progress entry first, then attach photos to it.</p>
                ) : (
                  <>
                    <Select
                      label="Attach to entry"
                      value={uploadEntryId}
                      onChange={(e) => setUploadEntryId(e.target.value)}
                      options={entriesDesc.map((e) => ({
                        value: e._id,
                        label: `${formatDate(e.date)}${num(e.weightKg) !== null ? ` · ${fmt(e.weightKg, 'kg')}` : ''}`,
                      }))}
                      disabled={loading || uploading}
                    />
                    <FileUpload
                      label="Add progress photos"
                      accept="image/*"
                      multiple
                      maxSizeMB={10}
                      onUpload={handleUpload}
                      uploading={uploading}
                      progress={uploadProgress}
                    />
                  </>
                )}
              </div>

              <div className={styles.gallery}>
                {loading ? (
                  <div className={styles.thumbGrid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} height={120} radius={12} />
                    ))}
                  </div>
                ) : photoGroups.length === 0 ? (
                  <EmptyState icon="image" title="No photos yet" message="Upload photos to compare your progress visually." compact />
                ) : (
                  photoGroups.map((group) => (
                    <section key={group.id} className={styles.photoGroup} aria-label={`Photos from ${formatDate(group.date)}`}>
                      <h3 className={styles.groupDate}>{formatDate(group.date)}</h3>
                      <ul className={styles.thumbGrid}>
                        {group.photos.map((url, i) => {
                          const index = flatPhotos.findIndex((p) => p.url === url && p.date === group.date);
                          return (
                            <li key={`${url}-${i}`}>
                              <button
                                type="button"
                                className={styles.thumb}
                                onClick={() => setLightbox(index)}
                                aria-label={`Open photo ${i + 1} from ${formatDate(group.date)}`}
                              >
                                <img src={url} alt="" loading="lazy" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ---------- Modals ---------- */}
      <Modal
        open={addOpen}
        onClose={creating ? undefined : () => setAddOpen(false)}
        title="New progress entry"
        description="Weight is required — everything else is optional."
        size="lg"
        closeOnBackdrop={!creating}
      >
        <ProgressForm
          onSubmit={handleCreate}
          onCancel={() => setAddOpen(false)}
          submitting={creating}
          serverErrors={serverErrors}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this entry?"
        message={toDelete ? `The entry from ${formatDate(toDelete.date)} and its photos will be removed permanently.` : ''}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      <Modal
        open={Boolean(current)}
        onClose={() => setLightbox(null)}
        title={current ? formatDate(current.date) : ''}
        description={current ? `Photo ${lightbox + 1} of ${flatPhotos.length} · use ← → to navigate` : undefined}
        size="xl"
      >
        {current && (
          <div className={styles.lightbox}>
            <Button
              variant="secondary"
              icon="chevronLeft"
              iconOnly
              aria-label="Previous photo"
              onClick={showPrev}
              disabled={flatPhotos.length < 2}
              className={styles.navBtn}
            />
            <figure className={styles.lightboxFigure}>
              <img src={current.url} alt={`Progress photo from ${formatDate(current.date)}`} />
            </figure>
            <Button
              variant="secondary"
              icon="chevronRight"
              iconOnly
              aria-label="Next photo"
              onClick={showNext}
              disabled={flatPhotos.length < 2}
              className={styles.navBtn}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
