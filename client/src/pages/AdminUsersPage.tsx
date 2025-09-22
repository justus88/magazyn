import { useEffect, useMemo, useState } from 'react';
import { deleteUser, fetchUsers, updateUserApproval, type AdminUser } from '../api/admin';
import { useAuthContext } from '../context/AuthContext';
import './AdminUsersPage.css';

type FilterStatus = 'pending' | 'active' | 'all';

type LoadState = 'idle' | 'loading' | 'error';

export function AdminUsersPage() {
  const { token } = useAuthContext();
  const [status, setStatus] = useState<FilterStatus>('pending');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setUsers([]);
      return;
    }

    const authToken = token;
    let isMounted = true;

    async function load() {
      setState('loading');
      setError(null);
      try {
        const response = await fetchUsers(authToken, status);
        if (isMounted) {
          setUsers(response.items);
          setState('idle');
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Nieznany błąd');
          setState('error');
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [status, token]);

  const pendingCount = useMemo(() => users.filter((user) => !user.isActive).length, [users]);

  async function handleApprove(userId: string, approve: boolean) {
    if (!token) {
      return;
    }
    const authToken = token;
    try {
      await updateUserApproval(authToken, userId, approve);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operacja nie powiodła się');
    }
  }

  async function handleDelete(userId: string) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm('Czy na pewno chcesz usunąć to konto?');
    if (!confirmed) {
      return;
    }

    const authToken = token;
    try {
      await deleteUser(authToken, userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Usunięcie konta nie powiodło się');
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Zarządzanie użytkownikami</h1>
          <p>Zatwierdzaj nowe konta i kontroluj dostęp do magazynu.</p>
        </div>
        <div className="admin-page__stats">
          <div className="stat-card">
            <span className="stat-card__label">Oczekujące konta</span>
            <strong className="stat-card__value">{pendingCount}</strong>
          </div>
        </div>
      </header>

      <section className="admin-page__filters">
        <label className="field">
          <span>Status kont</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus)}>
            <option value="pending">Oczekujące</option>
            <option value="active">Aktywne</option>
            <option value="all">Wszystkie</option>
          </select>
        </label>
      </section>

      {error && <div className="admin-page__error">{error}</div>}

      <div className="admin-table">
        <div className="admin-table__row admin-table__row--head">
          <span>E-mail</span>
          <span>Rola</span>
          <span>Data rejestracji</span>
          <span>Status</span>
          <span>Akcje</span>
        </div>
        {state === 'loading' ? (
          <div className="admin-table__empty">Ładowanie listy użytkowników…</div>
        ) : users.length === 0 ? (
          <div className="admin-table__empty">Brak użytkowników dla wybranego filtra.</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="admin-table__row">
              <span data-label="E-mail">{user.email}</span>
              <span data-label="Rola">{user.role.toLowerCase()}</span>
              <span data-label="Data rejestracji">
                {new Date(user.createdAt).toLocaleString('pl-PL')}
              </span>
              <span data-label="Status">
                {user.isActive ? (
                  <span className="badge badge--success">aktywne</span>
                ) : (
                  <span className="badge badge--pending">oczekujące</span>
                )}
              </span>
             <span className="admin-table__actions" data-label="Akcje">
                {user.isActive ? (
                  <button
                    type="button"
                    className="admin-table__button admin-table__button--secondary"
                    onClick={() => handleApprove(user.id, false)}
                  >
                    Dezaktywuj
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-table__button"
                    onClick={() => handleApprove(user.id, true)}
                  >
                    Zatwierdź
                  </button>
                )}
                <button
                  type="button"
                  className="admin-table__button admin-table__button--danger"
                  onClick={() => handleDelete(user.id)}
                >
                  Usuń
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
