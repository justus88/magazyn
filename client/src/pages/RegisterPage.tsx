import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import type { AuthCredentials } from '../types/auth';
import './AuthPages.css';

export function RegisterPage() {
  const { register } = useAuthContext();
  const navigate = useNavigate();

  const [form, setForm] = useState<AuthCredentials & { confirmPassword: string }>(
    {
      email: '',
      password: '',
      confirmPassword: '',
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      const response = await register({ email: form.email, password: form.password });
      setSuccessMessage(response.message ?? 'Konto zostało utworzone.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
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
        <p className="auth-card__subtitle">
          Utwórz konto serwisowe. Po zatwierdzeniu przez administratora otrzymasz dostęp do magazynu.
        </p>

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

          {error && <div className="auth-form__error">{error}</div>}
          {successMessage && <div className="auth-form__success">{successMessage}</div>}

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
