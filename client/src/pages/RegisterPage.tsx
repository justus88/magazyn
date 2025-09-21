import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import type { AuthCredentials, AuthUser } from '../types/auth';
import './AuthPages.css';

const roleOptions: Array<{ value: AuthUser['role']; label: string }> = [
  { value: 'TECHNICIAN', label: 'Serwisant' },
  { value: 'MANAGER', label: 'Magazynier' },
  { value: 'ADMIN', label: 'Administrator' },
];

export function RegisterPage() {
  const { register } = useAuthContext();
  const navigate = useNavigate();

  const [form, setForm] = useState<AuthCredentials & { role: AuthUser['role']; confirmPassword: string }>(
    {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'TECHNICIAN',
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Hasła muszą być takie same.');
      setIsSubmitting(false);
      return;
    }

    try {
      await register({ email: form.email, password: form.password, role: form.role });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieoczekiwany błąd');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Rejestracja</h1>
        <p className="auth-card__subtitle">Utwórz konto, aby korzystać z magazynu.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-form__field">
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
              placeholder="uzytkownik@firma.pl"
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-form__field">
            <span>Hasło</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
              placeholder="minimum 8 znaków"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <label className="auth-form__field">
            <span>Powtórz hasło</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((state) => ({ ...state, confirmPassword: event.target.value }))}
              placeholder="powtórz hasło"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <label className="auth-form__field">
            <span>Rola użytkownika</span>
            <select
              value={form.role}
              onChange={(event) => setForm((state) => ({ ...state, role: event.target.value as AuthUser['role'] }))}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {error && <div className="auth-form__error">{error}</div>}

          <button type="submit" className="auth-form__submit" disabled={isSubmitting}>
            {isSubmitting ? 'Tworzenie konta…' : 'Zarejestruj się'}
          </button>
        </form>

        <p className="auth-card__footer">
          Masz już konto? <Link to="/login">Zaloguj się</Link>
        </p>
      </div>
    </div>
  );
}
