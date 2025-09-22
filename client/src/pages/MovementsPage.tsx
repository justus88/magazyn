import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { fetchParts } from '../api/parts';
import {
  createMovement,
  fetchMovements,
  type Movement,
  type MovementType,
} from '../api/movements';
import { useAuthContext } from '../context/AuthContext';
import './MovementsPage.css';

interface MovementFormState {
  partId: string;
  movementType: MovementType;
  quantity: string;
  movementDate: string;
  deliveryDate: string;
  usageDate: string;
  referenceCode: string;
  notes: string;
}

const defaultForm: MovementFormState = {
  partId: '',
  movementType: 'DELIVERY',
  quantity: '',
  movementDate: new Date().toISOString().slice(0, 10),
  deliveryDate: '',
  usageDate: '',
  referenceCode: '',
  notes: '',
};

export function MovementsPage() {
  const { token } = useAuthContext();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [parts, setParts] = useState<{ id: string; name: string; catalogNumber: string }[]>([]);
  const [form, setForm] = useState<MovementFormState>(defaultForm);
  const [filters, setFilters] = useState({ partId: '', movementType: 'ALL' as 'ALL' | MovementType });
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return form.partId && form.quantity.trim();
  }, [form.partId, form.quantity]);

  async function loadData() {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [movementsResponse, partsResponse] = await Promise.all([
        fetchMovements(token, {
          partId: filters.partId || undefined,
          movementType: filters.movementType === 'ALL' ? undefined : filters.movementType,
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
          pageSize: 100,
        }),
        fetchParts(token, { pageSize: 200 }),
      ]);

      setMovements(movementsResponse.items ?? []);
      setParts(
        (partsResponse.items ?? []).map((part) => ({
          id: part.id,
          name: part.name,
          catalogNumber: part.catalogNumber,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się pobrać historii ruchów');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters, dateRange.startDate, dateRange.endDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    const parsedQuantity = Number(form.quantity.replace(',', '.'));
    if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
      setError('Podaj prawidłową ilość (różną od zera).');
      return;
    }

    try {
      await createMovement(token, {
        partId: form.partId,
        movementType: form.movementType,
        quantity: parsedQuantity,
        movementDate: form.movementDate || undefined,
        deliveryDate: form.deliveryDate || undefined,
        usageDate: form.usageDate || undefined,
        referenceCode: form.referenceCode || undefined,
        notes: form.notes || undefined,
      });
      setForm(defaultForm);
      setError(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zarejestrować ruchu');
    }
  }

  return (
    <div className="movements-page">
      <header className="movements-page__header">
        <div>
          <h1>Ruchy magazynowe</h1>
          <p>Rejestruj dostawy, zużycia i korekty stanów magazynowych.</p>
        </div>
      </header>

      <section className="movements-page__filters">
        <label className="field">
          <span>Część</span>
          <select
            value={filters.partId}
            onChange={(event) => setFilters((prev) => ({ ...prev, partId: event.target.value }))}
          >
            <option value="">Wszystkie</option>
            {parts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.catalogNumber} – {part.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Typ ruchu</span>
          <select
            value={filters.movementType}
            onChange={(event) => setFilters((prev) => ({ ...prev, movementType: event.target.value as 'ALL' | MovementType }))}
          >
            <option value="ALL">Wszystkie</option>
            <option value="DELIVERY">Dostawa</option>
            <option value="USAGE">Zużycie</option>
            <option value="ADJUSTMENT">Korekta</option>
          </select>
        </label>
        <label className="field">
          <span>Od</span>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(event) => setDateRange((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Do</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(event) => setDateRange((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </label>
        <button type="button" className="movements-page__refresh" onClick={loadData} disabled={isLoading}>
          Odśwież
        </button>
      </section>

      {error && <div className="movements-page__error">{error}</div>}

      <section className="movements-page__create">
        <h2>Nowy ruch magazynowy</h2>
        <form className="movements-form" onSubmit={handleSubmit}>
          <div className="movements-form__grid">
            <label className="field">
              <span>Część</span>
              <select
                value={form.partId}
                onChange={(event) => setForm((prev) => ({ ...prev, partId: event.target.value }))}
                required
              >
                <option value="">Wybierz część…</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.catalogNumber} – {part.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Typ ruchu</span>
              <select
                value={form.movementType}
                onChange={(event) => setForm((prev) => ({ ...prev, movementType: event.target.value as MovementType }))}
              >
                <option value="DELIVERY">Dostawa</option>
                <option value="USAGE">Zużycie</option>
                <option value="ADJUSTMENT">Korekta</option>
              </select>
            </label>
            <label className="field">
              <span>Ilość</span>
              <input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Data operacji</span>
              <input
                type="date"
                value={form.movementDate}
                onChange={(event) => setForm((prev) => ({ ...prev, movementDate: event.target.value }))}
              />
            </label>
            {form.movementType === 'DELIVERY' && (
              <label className="field">
                <span>Data dostawy</span>
                <input
                  type="date"
                  value={form.deliveryDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, deliveryDate: event.target.value }))}
                />
              </label>
            )}
            {form.movementType === 'USAGE' && (
              <label className="field">
                <span>Data zużycia</span>
                <input
                  type="date"
                  value={form.usageDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, usageDate: event.target.value }))}
                />
              </label>
            )}
            <label className="field">
              <span>Numer referencyjny</span>
              <input
                value={form.referenceCode}
                onChange={(event) => setForm((prev) => ({ ...prev, referenceCode: event.target.value }))}
                placeholder="np. numer dokumentu"
              />
            </label>
          </div>
          <label className="field">
            <span>Notatki</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
            />
          </label>

          <button type="submit" className="movements-form__submit" disabled={!canSubmit || isLoading}>
            Zapisz ruch
          </button>
        </form>
      </section>

      <section className="movements-page__list">
        <h2>Historia ruchów</h2>
        <div className="movements-table">
          <div className="movements-table__row movements-table__row--head">
            <span>Data</span>
            <span>Typ</span>
            <span>Ilość</span>
            <span>Część</span>
            <span>Wykonał</span>
            <span>Uwagi</span>
          </div>
          {isLoading ? (
            <div className="movements-table__empty">Ładowanie historii…</div>
          ) : movements.length === 0 ? (
            <div className="movements-table__empty">Brak zarejestrowanych ruchów.</div>
          ) : (
            movements.map((movement) => (
              <div key={movement.id} className="movements-table__row">
                <span data-label="Data">
                  {new Date(movement.movementDate).toLocaleString('pl-PL')}
                </span>
                <span data-label="Typ" className={`badge badge--${movement.movementType.toLowerCase()}`}>
                  {movement.movementType === 'DELIVERY'
                    ? 'Dostawa'
                    : movement.movementType === 'USAGE'
                    ? 'Zużycie'
                    : 'Korekta'}
                </span>
                <span data-label="Ilość">{movement.quantity}</span>
                <span data-label="Część">
                  {movement.part
                    ? `${movement.part.catalogNumber} – ${movement.part.name}`
                    : '—'}
                </span>
                <span data-label="Wykonał">{movement.performedBy?.email ?? '—'}</span>
                <span data-label="Uwagi">
                  {movement.referenceCode ? <strong>{movement.referenceCode}</strong> : null}
                  {movement.notes ? <p>{movement.notes}</p> : null}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
