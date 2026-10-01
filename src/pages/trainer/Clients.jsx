import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { getTrainerClients } from '../../api/trainerApi';
import { toList } from '../../api/axios';
import styles from '../../styles/Clients.module.css';

const LIMIT = 12;

const membershipStatus = (c) =>
  (c.membership && typeof c.membership === 'object' ? c.membership.status : undefined) || c.membershipStatus;

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search.trim(), 400);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const { data, loading, error, refetch } = useFetch(
    () => getTrainerClients(user?._id, { search: debounced, page, limit: LIMIT }),
    [user?._id, debounced, page]
  );

  const clients = toList(data);
  const total = data?.total ?? clients.length;
  const pages = data?.pages ?? 1;

  const columns = [
    {
      key: 'name',
      header: 'Client',
      render: (c) => (
        <span className={styles.person}>
          <Avatar src={c.avatarUrl} name={c.name} size={36} />
          <span className={styles.personText}>
            <span className={styles.name}>{c.name}</span>
            <span className={styles.subEmail}>{c.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'email', header: 'Email', hideOnMobile: true, render: (c) => c.email || '—' },
    { key: 'phone', header: 'Phone', hideOnMobile: true, render: (c) => c.phone || '—' },
    {
      key: 'membership',
      header: 'Membership',
      render: (c) => {
        const status = membershipStatus(c);
        return status ? <Badge status={status} size="sm" dot /> : <span className={styles.muted}>—</span>;
      },
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Coaching"
        title="Clients"
        subtitle={loading && !data ? 'Loading your roster…' : `${total} member${total === 1 ? '' : 's'} assigned to you`}
      />

      <div className={styles.toolbar} role="search">
        <Input
          label="Search clients"
          hideLabel
          type="search"
          icon="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !loading && clients.length === 0 ? (
        <EmptyState
          icon="users"
          title={debounced ? 'No matching clients' : 'No clients yet'}
          message={
            debounced
              ? `Nobody matches "${debounced}". Try a different name or email.`
              : 'When members are assigned to you, they will appear here.'
          }
        />
      ) : (
        <section className={styles.tableCard} aria-label="Client list">
          <Table
            columns={columns}
            data={clients}
            loading={loading}
            onRowClick={(c) => navigate(`/trainer/clients/${c._id}`)}
            caption="Your clients — select a row to view details"
            skeletonRows={6}
          />
          <div className={styles.pagination}>
            <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} disabled={loading} />
          </div>
        </section>
      )}
    </div>
  );
}
