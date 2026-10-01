import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Avatar from '../../components/common/Avatar';
import Icon from '../../components/common/Icon';
import Skeleton from '../../components/common/Skeleton';
import ErrorState from '../../components/common/ErrorState';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { getUsers, getUser, updateUser, deleteUser } from '../../api/adminApi';
import { freezeMembership } from '../../api/membershipApi';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { MEMBERSHIP_STATUS, PAGE_SIZE, ROLES } from '../../utils/constants';
import { formatDate, daysLeft } from '../../utils/formatDate';
import { rules, validate, hasErrors } from '../../utils/validators';
import styles from '../../styles/Members.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...MEMBERSHIP_STATUS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
];

const ROLE_OPTIONS = Object.values(ROLES).map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }));

const editSchema = {
  name: [rules.required('Name is required'), rules.minLength(2), rules.maxLength(80)],
  phone: [rules.phone()],
  role: [rules.required('Choose a role')],
};

const membershipOf = (user) => (user?.membership && typeof user.membership === 'object' ? user.membership : null);
const planName = (m) => (m?.plan && typeof m.plan === 'object' ? m.plan.name : null);

/* ======================================================================= */

export default function Members() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState(null); // 'freeze' | 'activate'
  const [bulkPending, setBulkPending] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const debouncedSearch = useDebounce(search.trim(), 400);
  const sortParam = sort.dir === 'desc' ? `-${sort.key}` : sort.key;

  // Reset to page 1 whenever filters/sort change.
  const filterKey = `${debouncedSearch}|${status}|${sortParam}`;
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current !== filterKey) {
      lastFilterKey.current = filterKey;
      setPage(1);
    }
  }, [filterKey]);

  const { data, loading, error, refetch } = useFetch(
    () => getUsers({ role: 'member', search: debouncedSearch, status, sort: sortParam, page, limit: PAGE_SIZE }),
    [debouncedSearch, status, sortParam, page]
  );

  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  // Remember every user we've seen so selections across pages keep their membership info.
  const seen = useRef(new Map());
  useEffect(() => {
    rows.forEach((u) => seen.current.set(u._id, u));
  }, [rows]);

  const selectedUsers = selectedIds.map((id) => seen.current.get(id) || rows.find((r) => r._id === id)).filter(Boolean);
  const actionable = selectedUsers.filter((u) => membershipOf(u)?._id);
  const skipped = selectedUsers.length - actionable.length;

  const onSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const runBulk = async () => {
    const freeze = bulkAction === 'freeze';
    setBulkPending(true);
    const results = await Promise.allSettled(actionable.map((u) => freezeMembership(membershipOf(u)._id, freeze)));
    setBulkPending(false);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    const verb = freeze ? 'frozen' : 'activated';
    const parts = [`${ok} ${verb}`];
    if (failed) parts.push(`${failed} failed`);
    if (skipped) parts.push(`${skipped} skipped (no membership)`);
    const msg = parts.join(', ');
    if (failed && !ok) {
      const firstErr = results.find((r) => r.status === 'rejected');
      toast.error(`${msg}. ${getErrorMessage(firstErr?.reason)}`);
    } else if (failed) toast.error(msg);
    else toast.success(msg);
    setBulkAction(null);
    setSelectedIds([]);
    refetch();
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Member',
        sortable: true,
        render: (u) => (
          <span className={styles.memberCell}>
            <Avatar src={u.avatarUrl} name={u.name} size={32} />
            <span className={styles.memberName}>{u.name || '—'}</span>
          </span>
        ),
      },
      { key: 'email', header: 'Email', sortable: true, hideOnMobile: true, render: (u) => <span className={styles.muted}>{u.email}</span> },
      { key: 'createdAt', header: 'Joined', sortable: true, hideOnMobile: true, render: (u) => formatDate(u.createdAt) },
      { key: 'plan', header: 'Plan', sortable: true, render: (u) => planName(membershipOf(u)) || <span className={styles.muted}>—</span> },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (u) => {
          const m = membershipOf(u);
          return m?.status ? <Badge status={m.status} dot /> : <Badge tone="neutral">none</Badge>;
        },
      },
      {
        key: 'endDate',
        header: 'Ends',
        sortable: true,
        hideOnMobile: true,
        render: (u) => {
          const m = membershipOf(u);
          return m?.endDate ? formatDate(m.endDate) : '—';
        },
      },
    ],
    []
  );

  const filtersActive = Boolean(debouncedSearch || status);

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Admin" title="Members" subtitle={loading && !data ? 'Loading members…' : `${total} member${total === 1 ? '' : 's'}`} />

      <section className={styles.toolbar} aria-label="Filter members">
        <Input
          label="Search members"
          hideLabel
          icon="search"
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
        />
        <Select
          label="Membership status"
          hideLabel
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={styles.statusSelect}
        />
        {filtersActive && (
          <Button
            variant="ghost"
            icon="close"
            onClick={() => {
              setSearch('');
              setStatus('');
            }}
          >
            Clear
          </Button>
        )}
      </section>

      {selectedIds.length > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="Bulk actions">
          <p className={styles.bulkCount}>
            <strong>{selectedIds.length}</strong> selected
            {skipped > 0 && <span className={styles.bulkNote}> · {skipped} without a membership will be skipped</span>}
          </p>
          <div className={styles.bulkActions}>
            <Button size="sm" variant="secondary" icon="snowflake" onClick={() => setBulkAction('freeze')} disabled={!actionable.length}>
              Freeze
            </Button>
            <Button size="sm" variant="primary" icon="play" onClick={() => setBulkAction('activate')} disabled={!actionable.length}>
              Activate
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

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
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(u) => setActiveId(u._id)}
            caption="Gym members"
            emptyTitle={filtersActive ? 'No matching members' : 'No members yet'}
            emptyMessage={filtersActive ? 'Try a different search or status.' : 'Members appear here once they sign up.'}
          />
          <Pagination page={page} pages={pages} total={total} limit={PAGE_SIZE} onPageChange={setPage} disabled={loading} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(bulkAction)}
        title={bulkAction === 'freeze' ? 'Freeze memberships?' : 'Activate memberships?'}
        message={
          `${actionable.length} membership${actionable.length === 1 ? '' : 's'} will be ${bulkAction === 'freeze' ? 'frozen' : 're-activated'}.` +
          (skipped ? ` ${skipped} selected member${skipped === 1 ? ' has' : 's have'} no membership and will be skipped.` : '')
        }
        confirmLabel={bulkAction === 'freeze' ? 'Freeze' : 'Activate'}
        loading={bulkPending}
        onConfirm={runBulk}
        onCancel={() => setBulkAction(null)}
      />

      <MemberDrawer
        userId={activeId}
        onClose={() => setActiveId(null)}
        onChanged={refetch}
        onDeleted={(id) => {
          setActiveId(null);
          setSelectedIds((ids) => ids.filter((x) => x !== id));
          refetch();
        }}
      />
    </div>
  );
}

/* ======================================================================= */

function MemberDrawer({ userId, onClose, onChanged, onDeleted }) {
  const open = Boolean(userId);
  const { data: user, loading, error, refetch, setData } = useFetch(
    () => (userId ? getUser(userId) : Promise.resolve(null)),
    [userId]
  );

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', role: 'member' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setEditing(false);
    setErrors({});
  }, [userId]);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', phone: user.phone || '', role: user.role || 'member' });
  }, [user]);

  const membership = membershipOf(user);
  const isFrozen = membership?.status === 'frozen';
  const left = membership?.endDate ? daysLeft(membership.endDate) : null;

  const change = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    const v = validate(form, editSchema);
    setErrors(v);
    if (hasErrors(v)) return;
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim(), role: form.role };
      const updated = await updateUser(userId, payload);
      setData((prev) => ({ ...prev, ...(updated && typeof updated === 'object' ? updated : payload) }));
      toast.success('Member updated');
      setEditing(false);
      onChanged();
    } catch (err) {
      setErrors((er) => ({ ...er, ...getFieldErrors(err) }));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleFreeze = async () => {
    if (!membership?._id) return;
    setFreezing(true);
    try {
      await freezeMembership(membership._id, !isFrozen);
      toast.success(isFrozen ? 'Membership re-activated' : 'Membership frozen');
      refetch();
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setFreezing(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteUser(userId);
      toast.success(`${user?.name || 'Member'} deleted`);
      setConfirmDelete(false);
      onDeleted(userId);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const ec = user?.emergencyContact;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        variant="drawer"
        size="md"
        title={user?.name || 'Member details'}
        description={user?.email}
        footer={
          user && !editing ? (
            <>
              <Button variant="danger" icon="trash" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </>
          ) : null
        }
      >
        {loading ? (
          <div className={styles.drawerLoading} role="status">
            <span className="sr-only">Loading member…</span>
            <Skeleton circle height={72} />
            <Skeleton count={4} height={14} />
            <Skeleton height={140} radius={16} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} compact />
        ) : user ? (
          <div className={styles.drawer}>
            <section className={styles.profile} aria-label="Profile">
              <Avatar src={user.avatarUrl} name={user.name} size={72} ring />
              <div>
                <p className={styles.profileName}>{user.name}</p>
                <Badge tone="primary" size="sm">
                  {user.role || 'member'}
                </Badge>
                {user.createdAt && <p className={styles.muted}>Joined {formatDate(user.createdAt)}</p>}
              </div>
            </section>

            {editing ? (
              <form className={styles.editForm} onSubmit={save} noValidate>
                <h3 className={styles.sectionTitle}>Edit details</h3>
                <Input label="Full name" value={form.name} onChange={change('name')} error={errors.name} required data-autofocus />
                <Input label="Phone" type="tel" value={form.phone} onChange={change('phone')} error={errors.phone} />
                <Select label="Role" options={ROLE_OPTIONS} value={form.role} onChange={change('role')} error={errors.role} required />
                <div className={styles.formActions}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setErrors({});
                      setForm({ name: user.name || '', phone: user.phone || '', role: user.role || 'member' });
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving} icon="check">
                    Save changes
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <section aria-labelledby="contact-heading">
                  <h3 id="contact-heading" className={styles.sectionTitle}>
                    Contact
                  </h3>
                  <ul className={styles.infoList}>
                    <li>
                      <Icon name="mail" size={16} />
                      {user.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : '—'}
                    </li>
                    <li>
                      <Icon name="phone" size={16} />
                      {user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : '—'}
                    </li>
                  </ul>
                </section>

                <section aria-labelledby="ec-heading">
                  <h3 id="ec-heading" className={styles.sectionTitle}>
                    Emergency contact
                  </h3>
                  {ec?.name || ec?.phone ? (
                    <ul className={styles.infoList}>
                      <li>
                        <Icon name="heart" size={16} />
                        {ec.name || '—'}
                        {ec.relation && <span className={styles.muted}> ({ec.relation})</span>}
                      </li>
                      <li>
                        <Icon name="phone" size={16} />
                        {ec.phone ? <a href={`tel:${ec.phone}`}>{ec.phone}</a> : '—'}
                      </li>
                    </ul>
                  ) : (
                    <p className={styles.muted}>Not provided.</p>
                  )}
                </section>
              </>
            )}

            <section aria-labelledby="membership-heading">
              <h3 id="membership-heading" className={styles.sectionTitle}>
                Membership
              </h3>
              {membership ? (
                <article className={styles.membershipCard}>
                  <div className={styles.membershipTop}>
                    <p className={styles.planName}>{planName(membership) || 'Membership'}</p>
                    <Badge status={membership.status} dot />
                  </div>
                  <dl className={styles.membershipMeta}>
                    <div>
                      <dt>Started</dt>
                      <dd>{membership.startDate ? formatDate(membership.startDate) : '—'}</dd>
                    </div>
                    <div>
                      <dt>Ends</dt>
                      <dd>{membership.endDate ? formatDate(membership.endDate) : '—'}</dd>
                    </div>
                    <div>
                      <dt>Days left</dt>
                      <dd>{left === null ? '—' : Math.max(0, left)}</dd>
                    </div>
                  </dl>
                  {(membership.status === 'active' || isFrozen) && (
                    <Button
                      variant={isFrozen ? 'primary' : 'secondary'}
                      icon={isFrozen ? 'play' : 'snowflake'}
                      onClick={toggleFreeze}
                      loading={freezing}
                      fullWidth
                    >
                      {isFrozen ? 'Unfreeze membership' : 'Freeze membership'}
                    </Button>
                  )}
                </article>
              ) : (
                <p className={styles.muted}>This member has no membership.</p>
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Delete this member?"
        message={`${user?.name || 'This member'} and their data will be permanently removed. This can't be undone.`}
        confirmLabel="Delete member"
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
