import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Category } from '../api/categories';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../api/categories';
import { useAuthContext } from '../context/AuthContext';
import './CategoriesPage.css';

interface FormState {
  name: string;
  description: string;
}

export function CategoriesPage() {
  const { token, user } = useAuthContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>({ name: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<FormState>({ name: '', description: '' });

  const canModify = useMemo(() => {
    return user?.role === 'ADMIN' || user?.role === 'SERWISANT';
  }, [user]);

  async function loadCategories(currentSearch?: string) {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchCategories(token, currentSearch?.trim() || undefined);
      setCategories(response.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd podczas pobierania kategorii');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCategories(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function resetCreateForm() {
    setCreateForm({ name: '', description: '' });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canModify) {
      return;
    }

    try {
      const response = await createCategory(token, {
        name: createForm.name,
        description: createForm.description ? createForm.description : undefined,
      });
      setCategories((prev) => [response.category, ...prev]);
      resetCreateForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się utworzyć kategorii');
    }
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditingForm({ name: category.name, description: category.description ?? '' });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingForm({ name: '', description: '' });
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, categoryId: string) {
    event.preventDefault();
    if (!token || !canModify) {
      return;
    }

    try {
      const response = await updateCategory(token, categoryId, {
        name: editingForm.name || undefined,
        description: editingForm.description ? editingForm.description : null,
      });
      setCategories((prev) =>
        prev.map((category) => (category.id === categoryId ? response.category : category)),
      );
      cancelEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zaktualizować kategorii');
    }
  }

  async function handleDelete(categoryId: string) {
    if (!token || !canModify) {
      return;
    }

    const confirmed = window.confirm('Czy na pewno chcesz usunąć tę kategorię?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteCategory(token, categoryId);
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć kategorii');
    }
  }

  const filteredCategories = useMemo(() => {
    if (!search) {
      return categories;
    }

    const term = search.trim().toLowerCase();
    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(term) ||
        (category.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [categories, search]);

  return (
    <div className="categories-page">
      <header className="categories-page__header">
        <div>
          <h1>Kategorie części</h1>
          <p>Zarządzaj grupami części i monitoruj liczbę pozycji w każdej z nich.</p>
        </div>
        <div className="categories-page__filters">
          <label className="field">
            <span>Wyszukaj</span>
            <input
              type="search"
              value={search}
              placeholder="Nazwa lub opis kategorii"
              onChange={(event) => {
                const value = event.target.value;
                setSearch(value);
                loadCategories(value);
              }}
            />
          </label>
        </div>
      </header>

      {error && <div className="categories-page__error">{error}</div>}

      {canModify && (
        <section className="categories-page__create">
          <h2>Dodaj nową kategorię</h2>
          <form onSubmit={handleCreate} className="categories-form">
            <div className="categories-form__row">
              <label className="field">
                <span>Nazwa</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Np. Smary, Elementy złączne"
                  required
                  minLength={1}
                />
              </label>
              <label className="field">
                <span>Opis (opcjonalnie)</span>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Krótki opis kategorii"
                />
              </label>
            </div>
            <button type="submit" className="categories-form__submit" disabled={isLoading}>
              Dodaj kategorię
            </button>
          </form>
        </section>
      )}

      <section className="categories-page__list">
        <div className="categories-table">
          <div className="categories-table__row categories-table__row--head">
            <span>Nazwa</span>
            <span>Opis</span>
            <span>Liczba części</span>
            {canModify && <span>Akcje</span>}
          </div>
          {isLoading ? (
            <div className="categories-table__empty">Ładowanie kategorii…</div>
          ) : filteredCategories.length === 0 ? (
            <div className="categories-table__empty">Brak kategorii spełniających kryteria.</div>
          ) : (
            filteredCategories.map((category) => {
              if (editingId === category.id) {
                return (
                  <form
                    key={category.id}
                    className="categories-table__row categories-table__row--editing"
                    onSubmit={(event) => handleUpdate(event, category.id)}
                  >
                    <span data-label="Nazwa">
                      <input
                        type="text"
                        value={editingForm.name}
                        onChange={(event) =>
                          setEditingForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        required
                      />
                    </span>
                    <span data-label="Opis">
                      <input
                        type="text"
                        value={editingForm.description}
                        onChange={(event) =>
                          setEditingForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                      />
                    </span>
                    <span data-label="Części">{category.partsCount ?? 0}</span>
                    <span className="categories-table__actions" data-label="Akcje">
                      <button type="submit" className="categories-table__button">
                        Zapisz
                      </button>
                      <button
                        type="button"
                        className="categories-table__button categories-table__button--secondary"
                        onClick={cancelEditing}
                      >
                        Anuluj
                      </button>
                    </span>
                  </form>
                );
              }

              return (
                <div key={category.id} className="categories-table__row">
                  <span data-label="Nazwa">{category.name}</span>
                  <span data-label="Opis">{category.description ?? '—'}</span>
                  <span data-label="Części">{category.partsCount ?? 0}</span>
                  {canModify && (
                    <span className="categories-table__actions" data-label="Akcje">
                      <button
                        type="button"
                        className="categories-table__button"
                        onClick={() => startEditing(category)}
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        className="categories-table__button categories-table__button--danger"
                        onClick={() => handleDelete(category.id)}
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
