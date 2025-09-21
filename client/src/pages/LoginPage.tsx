import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import type { AuthCredentials } from '../types/auth';
import './AuthPages.css';

export function LoginPage() {
  const { login } = useAuthContext();
  const navigate = useNavigate();

  const [form, setForm] = useState<AuthCredentials>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await login(form);
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
        <h1>Logowanie</h1>
        <p className="auth-card__subtitle">Zaloguj się, aby zarządzać magazynem.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-form__field">
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
              placeholder="uzytkownik@firma.pl"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-form__field">
            <span>Hasło</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </label>

          {error && <div className="auth-form__error">{error}</div>}

          <button type="submit" className="auth-form__submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>

        <p className="auth-card__footer">
          Nie masz konta? <Link to="/register">Zarejestruj się</Link>
        </p>
      </div>
    </div>
  );
}
