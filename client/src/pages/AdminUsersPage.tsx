import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createUser,
  deleteUser,
  fetchRegistrationSettings,
  fetchUsers,
  updateRegistrationSettings,
  updateUserApproval,
  type AdminUser,
  type CreateUserPayload,
} from '../api/admin';
import { useAuthContext } from '../context/AuthContext';
import './AdminUsersPage.css';

type FilterStatus = 'pending' | 'active' | 'all';

type LoadState = 'idle' | 'loading' | 'error';

const assignableRoles: AdminUser['role'][] = ['SERWISANT', 'ADMIN'];

export function AdminUsersPage() {
  const { token } = useAuthContext();
  const [status, setStatus] = useState<FilterStatus>('pending');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [registrationAllowed, setRegistrationAllowed] = useState<boolean | null>(null);
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(false);
  const [isUpdatingRegistration, setIsUpdatingRegistration] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'SERWISANT' as AdminUser['role'],
    isActive: true,
  });
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserMessage, setCreateUserMessage] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

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

  useEffect(() => {
    if (!token) {
      setRegistrationAllowed(null);
      return;
    }

    const authToken = token;
    let isMounted = true;

    async function loadSettings() {
      setIsLoadingRegistration(true);
      setRegistrationError(null);
      try {
        const response = await fetchRegistrationSettings(authToken);
        if (isMounted) {
          setRegistrationAllowed(response.allowSelfRegistration);
        }
      } catch (err) {
        if (isMounted) {
          setRegistrationError(
            err instanceof Error
              ? err.message
              : 'Nie udało się pobrać ustawień rejestracji',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingRegistration(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const pendingCount = useMemo(() => users.filter((user) => !user.isActive).length, [users]);

  const isRegistrationKnown = registrationAllowed !== null;
  const registrationButtonDisabled =
    !isRegistrationKnown || isUpdatingRegistration || isLoadingRegistration;
  const registrationButtonLabel = isUpdatingRegistration
    ? 'Aktualizowanie…'
    : !isRegistrationKnown || isLoadingRegistration
      ? 'Ładowanie…'
      : registrationAllowed
        ? 'Wyłącz rejestrację'
        : 'Włącz rejestrację';
  const registrationBadge = !isRegistrationKnown ? (
    <span className="badge badge--pending">ładowanie…</span>
  ) : registrationAllowed ? (
    <span className="badge badge--success">włączona</span>
  ) : (
    <span className="badge badge--muted">wyłączona</span>
  );

  async function handleToggleRegistration() {
    if (!token || registrationAllowed === null) {
      return;
    }

    const authToken = token;
    setIsUpdatingRegistration(true);
    setRegistrationError(null);
    setRegistrationMessage(null);
    try {
      const response = await updateRegistrationSettings(authToken, !registrationAllowed);
      setRegistrationAllowed(response.allowSelfRegistration);
      setRegistrationMessage(response.message ?? null);
    } catch (err) {
      setRegistrationError(
        err instanceof Error
          ? err.message
          : 'Nie udało się zaktualizować ustawień rejestracji',
      );
    } finally {
      setIsUpdatingRegistration(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (newUserForm.password !== newUserForm.confirmPassword) {
      setCreateUserError('Hasła muszą być takie same.');
      setCreateUserMessage(null);
      return;
    }

    const authToken = token;
    setIsCreatingUser(true);
    setCreateUserError(null);
    setCreateUserMessage(null);

    const payload: CreateUserPayload = {
      email: newUserForm.email,
      password: newUserForm.password,
      role: newUserForm.role,
      isActive: newUserForm.isActive,
    };

    try {
      const response = await createUser(authToken, payload);
      setCreateUserMessage(response.message);
      setNewUserForm({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'SERWISANT' as AdminUser['role'],
        isActive: true,
      });
      setUsers((prev) => {
        const shouldInclude =
          status === 'all' ||
          (status === 'pending' && !response.user.isActive) ||
          (status === 'active' && response.user.isActive);
        if (!shouldInclude) {
          return prev;
        }
        return [response.user, ...prev];
      });
    } catch (err) {
      setCreateUserError(
        err instanceof Error ? err.message : 'Nie udało się utworzyć użytkownika',
      );
    } finally {
      setIsCreatingUser(false);
    }
  }

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
          <p>Zatwierdzaj konta, nadaj role i kontroluj dostęp do magazynu.</p>
        </div>
        <div className="admin-page__stats">
          <div className="stat-card">
            <span className="stat-card__label">Oczekujące konta</span>
            <strong className="stat-card__value">{pendingCount}</strong>
          </div>
        </div>
      </header>

      <section className="admin-section">
        <div className="admin-card">
          <div className="admin-card__header">
            <div>
              <h2>Samodzielna rejestracja</h2>
              <p>Zarządzaj dostępnością formularza rejestracyjnego dla nowych użytkowników.</p>
            </div>
            <div className="admin-card__controls">
              {registrationBadge}
              <button
                type="button"
                className="admin-card__button"
                onClick={handleToggleRegistration}
                disabled={registrationButtonDisabled}
              >
                {registrationButtonLabel}
              </button>
            </div>
          </div>
          {registrationMessage && (
            <p className="admin-card__feedback admin-card__feedback--success">
              {registrationMessage}
            </p>
          )}
          {registrationError && (
            <p className="admin-card__feedback admin-card__feedback--error">
              {registrationError}
            </p>
          )}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-card">
          <div className="admin-card__header admin-card__header--stacked">
            <div>
              <h2>Dodaj nowe konto</h2>
              <p>Administrator tworzy konto, nadaje rolę i decyduje o natychmiastowej aktywacji.</p>
            </div>
          </div>
          <form className="admin-form" onSubmit={handleCreateUser}>
            <div className="admin-form__grid">
              <label className="admin-form__field">
                <span>E-mail</span>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(event) =>
                    setNewUserForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                  placeholder="uzytkownik@firma.pl"
                  autoComplete="email"
                />
              </label>
              <label className="admin-form__field">
                <span>Rola</span>
                <select
                  value={newUserForm.role}
                  onChange={(event) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      role: event.target.value as AdminUser['role'],
                    }))
                  }
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role.toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-form__field">
                <span>Hasło początkowe</span>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(event) =>
                    setNewUserForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <label className="admin-form__field">
                <span>Powtórz hasło</span>
                <input
                  type="password"
                  value={newUserForm.confirmPassword}
                  onChange={(event) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <label className="admin-form__checkbox">
                <input
                  type="checkbox"
                  checked={newUserForm.isActive}
                  onChange={(event) =>
                    setNewUserForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                <span>Aktywuj konto od razu</span>
              </label>
            </div>
            {createUserError && (
              <p className="admin-card__feedback admin-card__feedback--error">{createUserError}</p>
            )}
            {createUserMessage && (
              <p className="admin-card__feedback admin-card__feedback--success">
                {createUserMessage}
              </p>
            )}
            <button
              type="submit"
              className="admin-card__button admin-card__button--primary"
              disabled={isCreatingUser}
            >
              {isCreatingUser ? 'Tworzenie konta…' : 'Utwórz konto'}
            </button>
          </form>
        </div>
      </section>

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
