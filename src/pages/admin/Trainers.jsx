import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Avatar from '../../components/common/Avatar';
import Icon from '../../components/common/Icon';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonGrid } from '../../components/common/Skeleton';
import TrainerForm from '../../components/forms/TrainerForm';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/adminApi';
import { getErrorMessage } from '../../api/axios';
import { PAGE_SIZE } from '../../utils/constants';
import styles from '../../styles/AdminTrainers.module.css';

const LIMIT = Math.max(PAGE_SIZE, 12);

export default function Trainers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState(null); // { mode: 'create' } | { mode: 'edit', trainer }
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debounced = useDebounce(search.trim(), 400);

  const lastSearch = useRef(debounced);
  useEffect(() => {
    if (lastSearch.current !== debounced) {
      lastSearch.current = debounced;
      setPage(1);
    }
  }, [debounced]);

  const { data, loading, error, refetch } = useFetch(
    () => getUsers({ role: 'trainer', search: debounced, page, limit: LIMIT }),
    [debounced, page]
  );

  const trainers = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleSubmit = async (payload) => {
    if (formState?.mode === 'edit') {
      const { name, phone, specializations, bio } = payload;
      await updateUser(formState.trainer._id, { name, phone, specializations, bio });
      toast.success(`${name} updated`);
    } else {
      await createUser(payload);
      toast.success(`${payload.name} added as a trainer`);
    }
    setFormState(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteUser(toDelete._id);
      toast.success(`${toDelete.name} removed`);
      setToDelete(null);
      if (trainers.length === 1 && page > 1) setPage((p) => p - 1);
      else refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Admin"
        title="Trainers"
        subtitle={loading && !data ? 'Loading coaching team…' : `${total} trainer${total === 1 ? '' : 's'} on the team`}
        actions={
          <Button icon="plus" onClick={() => setFormState({ mode: 'create' })}>
            Add trainer
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <Input
          label="Search trainers"
          hideLabel
          type="search"
          icon="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonGrid count={6} lines={4} minWidth={280} label="Loading trainers…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : trainers.length === 0 ? (
        <EmptyState
          icon="whistle"
          title={debounced ? 'No matching trainers' : 'No trainers yet'}
          message={debounced ? 'Try a different name or email.' : 'Add your first coach to start scheduling classes.'}
          action={
            !debounced && (
              <Button icon="plus" onClick={() => setFormState({ mode: 'create' })}>
                Add trainer
              </Button>
            )
          }
        />
      ) : (
        <ul className={styles.grid}>
          {trainers.map((t) => {
            const specs = Array.isArray(t.specializations) ? t.specializations : [];
            return (
              <li key={t._id}>
                <article className={styles.card}>
                  <header className={styles.cardHead}>
                    <Avatar src={t.avatarUrl} name={t.name} size={56} ring />
                    <div className={styles.identity}>
                      <h2 className={styles.name}>{t.name}</h2>
                      <p className={styles.role}>Trainer</p>
                    </div>
                  </header>

                  {specs.length > 0 ? (
                    <ul className={styles.specs} aria-label="Specializations">
                      {specs.map((s) => (
                        <li key={s} className={styles.spec}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.muted}>No specializations listed</p>
                  )}

                  {t.bio && <p className={styles.bio}>{t.bio}</p>}

                  <ul className={styles.contact}>
                    <li>
                      <Icon name="mail" size={15} />
                      {t.email ? <a href={`mailto:${t.email}`}>{t.email}</a> : '—'}
                    </li>
                    <li>
                      <Icon name="phone" size={15} />
                      {t.phone ? <a href={`tel:${t.phone}`}>{t.phone}</a> : '—'}
                    </li>
                  </ul>

                  <footer className={styles.cardActions}>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="edit"
                      onClick={() => setFormState({ mode: 'edit', trainer: t })}
                      aria-label={`Edit ${t.name}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      iconOnly
                      aria-label={`Delete ${t.name}`}
                      onClick={() => setToDelete(t)}
                      className={styles.deleteBtn}
                    />
                  </footer>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {!error && (
        <Pagination page={page} pages={data?.pages ?? 1} total={total} limit={LIMIT} onPageChange={setPage} disabled={loading} />
      )}

      <Modal
        open={Boolean(formState)}
        onClose={() => setFormState(null)}
        size="lg"
        title={formState?.mode === 'edit' ? `Edit ${formState.trainer?.name || 'trainer'}` : 'Add trainer'}
        description={
          formState?.mode === 'edit'
            ? 'Update profile details shown to members.'
            : 'Creates a trainer account. Share the temporary password with them securely.'
        }
      >
        {formState && (
          <TrainerForm
            key={formState.trainer?._id || 'new'}
            mode={formState.mode}
            initialValues={formState.trainer}
            onSubmit={handleSubmit}
            onCancel={() => setFormState(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Remove trainer?"
        message={`${toDelete?.name || 'This trainer'}'s account will be deleted. Classes they run may need a new trainer.`}
        confirmLabel="Delete trainer"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
