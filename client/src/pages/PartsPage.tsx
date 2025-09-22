import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { fetchCategories } from '../api/categories';
import {
  createPart,
  deletePart,
  fetchParts,
  updatePart,
  type Part,
} from '../api/parts';
import { useAuthContext } from '../context/AuthContext';
import './PartsPage.css';

interface PartFormState {
  catalogNumber: string;
  name: string;
  description: string;
  manufacturer: string;
  categoryId: string;
  unit: string;
  minimumQuantity: string;
  currentQuantity: string;
  storageLocation: string;
  barcode: string;
}

const emptyForm: PartFormState = {
  catalogNumber: '',
  name: '',
  description: '',
  manufacturer: '',
  categoryId: '',
  unit: 'szt',
  minimumQuantity: '',
  currentQuantity: '',
  storageLocation: '',
  barcode: '',
};

function parseNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

export function PartsPage() {
  const { token, user } = useAuthContext();
  const canModify = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PartFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<PartFormState>(emptyForm);

  async function loadData() {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [partsResponse, categoriesResponse] = await Promise.all([
        fetchParts(token, {
          search: search.trim() || undefined,
          categoryId: categoryFilter || undefined,
          pageSize: 200,
        }),
        fetchCategories(token, undefined),
      ]);

      setParts(partsResponse.items ?? []);
      setCategories(
        (categoriesResponse.items ?? []).map((category) => ({ id: category.id, name: category.name })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się pobrać danych części');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, categoryFilter]);

  function resetForm() {
    setForm(emptyForm);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canModify) {
      return;
    }

    try {
      const response = await createPart(token, {
        catalogNumber: form.catalogNumber.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        categoryId: form.categoryId || null,
        unit: form.unit.trim() || null,
        minimumQuantity: parseNumber(form.minimumQuantity),
        currentQuantity: parseNumber(form.currentQuantity) ?? 0,
        storageLocation: form.storageLocation.trim() || null,
        barcode: form.barcode.trim() || null,
      });

      setParts((prev) => [response.part, ...prev]);
      resetForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać części');
    }
  }

  function startEditing(part: Part) {
    setEditingId(part.id);
    setEditingForm({
      catalogNumber: part.catalogNumber,
      name: part.name,
      description: part.description ?? '',
      manufacturer: part.manufacturer ?? '',
      categoryId: part.categoryId ?? '',
      unit: part.unit ?? '',
      minimumQuantity: part.minimumQuantity !== null ? String(part.minimumQuantity) : '',
      currentQuantity: String(part.currentQuantity),
      storageLocation: part.storageLocation ?? '',
      barcode: part.barcode ?? '',
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingForm(emptyForm);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, partId: string) {
    event.preventDefault();
    if (!token || !canModify) {
      return;
    }

    try {
      const response = await updatePart(token, partId, {
        catalogNumber: editingForm.catalogNumber.trim(),
        name: editingForm.name.trim(),
        description: editingForm.description.trim() || null,
        manufacturer: editingForm.manufacturer.trim() || null,
        categoryId: editingForm.categoryId || null,
        unit: editingForm.unit.trim() || null,
        minimumQuantity: parseNumber(editingForm.minimumQuantity),
        currentQuantity: parseNumber(editingForm.currentQuantity),
        storageLocation: editingForm.storageLocation.trim() || null,
        barcode: editingForm.barcode.trim() || null,
      });

      setParts((prev) => prev.map((part) => (part.id === partId ? response.part : part)));
      cancelEditing();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zaktualizować części');
    }
  }

  async function handleDelete(partId: string) {
    if (!token || !canModify) {
      return;
    }

    const confirmed = window.confirm('Czy na pewno chcesz usunąć tę część z magazynu?');
    if (!confirmed) {
      return;
    }

    try {
      await deletePart(token, partId);
      setParts((prev) => prev.filter((part) => part.id !== partId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć części');
    }
  }

  const lowStockCount = useMemo(
    () =>
      parts.filter((part) => {
        if (part.minimumQuantity === null) {
          return part.currentQuantity <= 0;
        }
        return part.currentQuantity <= part.minimumQuantity;
      }).length,
    [parts],
  );

  const filteredParts = useMemo(() => {
    if (!search && !categoryFilter) {
      return parts;
    }

    const term = search.trim().toLowerCase();
    return parts.filter((part) => {
      const matchesTerm = term
        ? part.name.toLowerCase().includes(term) ||
          part.catalogNumber.toLowerCase().includes(term) ||
          (part.description ?? '').toLowerCase().includes(term)
        : true;
      const matchesCategory = categoryFilter ? part.categoryId === categoryFilter : true;
      return matchesTerm && matchesCategory;
    });
  }, [parts, search, categoryFilter]);

  return (
    <div className="parts-page">
      <header className="parts-page__header">
        <div>
          <h1>Części magazynowe</h1>
          <p>Monitoruj kartotekę części i aktualizuj stany minimalne.</p>
        </div>
        <div className="parts-page__stats">
          <div className="stat-card">
            <span className="stat-card__label">Liczba części</span>
            <strong className="stat-card__value">{parts.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Wymaga uzupełnienia</span>
            <strong className="stat-card__value">{lowStockCount}</strong>
          </div>
        </div>
      </header>

      <section className="parts-page__filters">
        <label className="field">
          <span>Wyszukaj</span>
          <input
            type="search"
            value={search}
            placeholder="Nazwa, numer katalogowy, opis"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Kategoria</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Wszystkie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="parts-page__refresh" onClick={loadData} disabled={isLoading}>
          Odśwież
        </button>
      </section>

      {error && <div className="parts-page__error">{error}</div>}

      {canModify && (
        <section className="parts-page__create">
          <h2>Dodaj nową część</h2>
          <form className="parts-form" onSubmit={handleCreate}>
            <div className="parts-form__grid">
              <label className="field">
                <span>Numer katalogowy</span>
                <input
                  value={form.catalogNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, catalogNumber: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Nazwa</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Kategoria</span>
                <select
                  value={form.categoryId}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                >
                  <option value="">Brak</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Producent</span>
                <input
                  value={form.manufacturer}
                  onChange={(event) => setForm((prev) => ({ ...prev, manufacturer: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Jednostka</span>
                <input
                  value={form.unit}
                  onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Min. ilość</span>
                <input
                  value={form.minimumQuantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, minimumQuantity: event.target.value }))}
                  placeholder="np. 5"
                />
              </label>
              <label className="field">
                <span>Aktualna ilość</span>
                <input
                  value={form.currentQuantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, currentQuantity: event.target.value }))}
                  placeholder="np. 10"
                />
              </label>
              <label className="field">
                <span>Lokalizacja</span>
                <input
                  value={form.storageLocation}
                  onChange={(event) => setForm((prev) => ({ ...prev, storageLocation: event.target.value }))}
                  placeholder="np. Regał A"
                />
              </label>
              <label className="field">
                <span>Kod kreskowy</span>
                <input
                  value={form.barcode}
                  onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
                />
              </label>
            </div>

            <label className="field">
              <span>Opis</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
              />
            </label>

            <button type="submit" className="parts-form__submit" disabled={isLoading}>
              Dodaj część
            </button>
          </form>
        </section>
      )}

      <section className="parts-page__list">
        <div className="parts-table">
          <div className="parts-table__row parts-table__row--head">
            <span>Numer katalogowy</span>
            <span>Nazwa</span>
            <span>Kategoria</span>
            <span>Ilość</span>
            <span>Min.</span>
            <span>Lokalizacja</span>
            {canModify && <span>Akcje</span>}
          </div>
          {isLoading ? (
            <div className="parts-table__empty">Ładowanie części…</div>
          ) : filteredParts.length === 0 ? (
            <div className="parts-table__empty">Brak części spełniających kryteria.</div>
          ) : (
            filteredParts.map((part) => {
              const isLow = part.minimumQuantity !== null
                ? part.currentQuantity <= part.minimumQuantity
                : part.currentQuantity <= 0;

              if (editingId === part.id) {
                return (
                  <form
                    key={part.id}
                    className="parts-table__row parts-table__row--editing"
                    onSubmit={(event) => handleUpdate(event, part.id)}
                  >
                    <span data-label="Numer katalogowy">
                      <input
                        value={editingForm.catalogNumber}
                        onChange={(event) =>
                          setEditingForm((prev) => ({ ...prev, catalogNumber: event.target.value }))
                        }
                        required
                      />
                    </span>
                    <span data-label="Nazwa">
                      <input
                        value={editingForm.name}
                        onChange={(event) => setEditingForm((prev) => ({ ...prev, name: event.target.value }))}
                        required
                      />
                    </span>
                    <span data-label="Kategoria">
                      <select
                        value={editingForm.categoryId}
                        onChange={(event) =>
                          setEditingForm((prev) => ({ ...prev, categoryId: event.target.value }))
                        }
                      >
                        <option value="">Brak</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </span>
                    <span data-label="Ilość">
                      <input
                        value={editingForm.currentQuantity}
                        onChange={(event) =>
                          setEditingForm((prev) => ({ ...prev, currentQuantity: event.target.value }))
                        }
                      />
                    </span>
                    <span data-label="Min.">
                      <input
                        value={editingForm.minimumQuantity}
                        onChange={(event) =>
                          setEditingForm((prev) => ({ ...prev, minimumQuantity: event.target.value }))
                        }
                      />
                    </span>
                    <span data-label="Lokalizacja">
                      <input
                        value={editingForm.storageLocation}
                        onChange={(event) =>
                          setEditingForm((prev) => ({ ...prev, storageLocation: event.target.value }))
                        }
                      />
                    </span>
                    <span className="parts-table__actions" data-label="Akcje">
                      <button type="submit" className="parts-table__button">
                        Zapisz
                      </button>
                      <button
                        type="button"
                        className="parts-table__button parts-table__button--secondary"
                        onClick={cancelEditing}
                      >
                        Anuluj
                      </button>
                    </span>
                  </form>
                );
              }

              return (
                <div key={part.id} className="parts-table__row">
                  <span data-label="Numer katalogowy" className="parts-table__cell--code">
                    {part.catalogNumber}
                  </span>
                  <span data-label="Nazwa">
                    <strong>{part.name}</strong>
                    {part.manufacturer ? <small>{part.manufacturer}</small> : null}
                  </span>
                  <span data-label="Kategoria">{part.category ?? '—'}</span>
                  <span
                    data-label="Ilość"
                    className={isLow ? 'parts-table__qty parts-table__qty--low' : 'parts-table__qty'}
                  >
                    {part.currentQuantity}
                    {part.unit ? ` ${part.unit}` : ''}
                  </span>
                  <span data-label="Min.">{part.minimumQuantity ?? '—'}</span>
                  <span data-label="Lokalizacja">{part.storageLocation ?? '—'}</span>
                  {canModify && (
                    <span className="parts-table__actions" data-label="Akcje">
                      <button
                        type="button"
                        className="parts-table__button"
                        onClick={() => startEditing(part)}
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        className="parts-table__button parts-table__button--danger"
                        onClick={() => handleDelete(part.id)}
                      >
                        Usuń
                      </button>
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
