import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import StatCard from '../../components/common/StatCard';
import Icon from '../../components/common/Icon';
import ErrorState from '../../components/common/ErrorState';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { getPayments } from '../../api/membershipApi';
import { PAYMENT_STATUS, PAGE_SIZE } from '../../utils/constants';
import { formatCurrency, formatNumber } from '../../utils/formatCurrency';
import { formatDate, formatTime } from '../../utils/formatDate';
import styles from '../../styles/Payments.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...PAYMENT_STATUS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
];

const userOf = (p) => (p?.user && typeof p.user === 'object' ? p.user : p?.member && typeof p.member === 'object' ? p.member : null);
const planOf = (p) => {
  if (p?.plan && typeof p.plan === 'object') return p.plan;
  const mPlan = p?.membership?.plan;
  return mPlan && typeof mPlan === 'object' ? mPlan : null;
};

export default function Payments() {
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search.trim(), 400);
  const sortParam = sort.dir === 'desc' ? `-${sort.key}` : sort.key;
  const rangeInvalid = Boolean(from && to && from > to);

  const filterKey = `${status}|${from}|${to}|${debouncedSearch}|${sortParam}`;
  const lastKey = useRef(filterKey);
  useEffect(() => {
    if (lastKey.current !== filterKey) {
      lastKey.current = filterKey;
      setPage(1);
    }
  }, [filterKey]);

  const { data, loading, error, refetch } = useFetch(
    () =>
      getPayments({
        status,
        // Send full-day bounds so "to" includes the whole day.
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to && !rangeInvalid ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        search: debouncedSearch,
        sort: sortParam,
        page,
        limit: PAGE_SIZE,
      }),
    [status, from, to, debouncedSearch, sortParam, page, rangeInvalid]
  );

  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;

  const summary = useMemo(() => {
    const paid = rows.filter((p) => p.status === 'paid');
    return {
      collected: paid.reduce((s, p) => s + (Number(p.amount) || 0), 0),
      failed: rows.filter((p) => p.status === 'failed').length,
    };
  }, [rows]);

  const onSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'amount' ? 'desc' : 'asc' }));

  const filtersActive = Boolean(status || from || to || debouncedSearch);
  const clearFilters = () => {
    setStatus('');
    setFrom('');
    setTo('');
    setSearch('');
  };

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (p) => (
        <span className={styles.dateCell}>
          <span>{formatDate(p.createdAt)}</span>
          <span className={styles.muted}>{formatTime(p.createdAt)}</span>
        </span>
      ),
    },
    {
      key: 'member',
      header: 'Member',
      render: (p) => {
        const u = userOf(p);
        if (!u) return <span className={styles.muted}>—</span>;
        return (
          <span className={styles.memberCell}>
            <span className={styles.memberName}>{u.name || u.email}</span>
            {u.name && u.email && <span className={styles.muted}>{u.email}</span>}
          </span>
        );
      },
    },
    {
      key: 'plan',
      header: 'Plan',
      hideOnMobile: true,
      render: (p) => planOf(p)?.name || <span className={styles.muted}>—</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (p) => <span className={styles.amount}>{formatCurrency(p.amount)}</span>,
    },
    { key: 'status', header: 'Status', render: (p) => (p.status ? <Badge status={p.status} dot /> : '—') },
    {
      key: 'invoice',
      header: 'Invoice',
      align: 'right',
      hideOnMobile: true,
      render: (p) =>
        p.invoiceUrl ? (
          <a
            className={styles.invoiceLink}
            href={p.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open invoice for ${formatCurrency(p.amount)} on ${formatDate(p.createdAt)} (opens in new tab)`}
          >
            <Icon name="file" size={15} />
            View
          </a>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Admin" title="Payments" subtitle="Every transaction across all members." />

      <section className={styles.summary} aria-label="Summary for current results">
        <StatCard
          label="Collected (this page)"
          value={formatCurrency(summary.collected)}
          icon="card"
          tone="success"
          loading={loading}
          hint="Sum of paid payments shown"
        />
        <StatCard
          label="Payments"
          value={formatNumber(total)}
          icon="receipt"
          tone="info"
          loading={loading}
          hint={filtersActive ? 'Matching filters' : 'All time'}
        />
        <StatCard
          label="Failed (this page)"
          value={formatNumber(summary.failed)}
          icon="alert"
          tone="accent"
          loading={loading}
          hint="Needs follow-up"
        />
      </section>

      <section className={styles.filters} aria-label="Filter payments">
        <Input
          label="Search"
          type="search"
          icon="search"
          placeholder="Member name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchField}
        />
        <Select label="Status" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
        <Input label="From" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <Input
          label="To"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          error={rangeInvalid ? '"To" must be on or after "From"' : undefined}
        />
        {filtersActive && (
          <Button variant="ghost" icon="close" onClick={clearFilters} className={styles.clearBtn}>
            Clear filters
          </Button>
        )}
      </section>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <Table
            columns={columns}
            data={rows}
            loading={loading}
            sort={sort}
            onSort={onSort}
            caption="Payments"
            emptyTitle={filtersActive ? 'No matching payments' : 'No payments yet'}
            emptyMessage={filtersActive ? 'Try widening the date range or clearing filters.' : 'Payments appear here once members subscribe.'}
          />
          <Pagination page={page} pages={data?.pages ?? 1} total={total} limit={PAGE_SIZE} onPageChange={setPage} disabled={loading} />
        </>
      )}
    </div>
  );
}
