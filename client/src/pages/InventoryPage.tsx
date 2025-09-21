import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import type { Part, PartsResponse } from '../types/inventory';
import './InventoryPage.css';

function determineLowStock(part: Part) {
  const minimum = part.minimumQuantity ?? 0;
  return minimum > 0 ? part.currentQuantity <= minimum : part.currentQuantity <= 0;
}

export function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function fetchParts() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiRequest<PartsResponse>('/api/parts?pageSize=200');
        setParts(data.items ?? []);
        setTotalCount(data.pagination?.total ?? data.items?.length ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchParts();
  }, []);

  const filteredParts = useMemo(() => {
    if (!search) {
      return parts;
    }

    const safeSearch = search.trim().toLowerCase();
    return parts.filter((part) => {
      return (
        part.name.toLowerCase().includes(safeSearch) ||
        part.catalogNumber.toLowerCase().includes(safeSearch) ||
        (part.category?.toLowerCase().includes(safeSearch) ?? false)
      );
    });
  }, [parts, search]);

  const lowStockParts = useMemo(
    () => filteredParts.filter((part) => determineLowStock(part)),
    [filteredParts],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Magazyn serwisowy</h1>
          <p>Zarządzaj stanami magazynowymi i historią części serwisowych.</p>
        </div>
      </header>

      <section className="app__filters">
        <label className="field">
          <span>Wyszukaj</span>
          <input
            type="search"
            placeholder="Nazwa, numer katalogowy lub kategoria"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </section>

      <section className="app__summary">
        <div className="summary-card">
          <span className="summary-card__label">Łącznie pozycji</span>
          <strong className="summary-card__value">{totalCount}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Braki na magazynie</span>
          <strong className="summary-card__value">{lowStockParts.length}</strong>
        </div>
      </section>

      <section className="app__content">
        <div className="panel">
          <div className="panel__header">
            <h2>Lista części</h2>
            {isLoading && <span className="status status--loading">Ładowanie...</span>}
            {error && <span className="status status--error">Błąd: {error}</span>}
          </div>

          <div className="parts-table">
            <div className="parts-table__row parts-table__row--head">
              <span>Numer katalogowy</span>
              <span>Nazwa</span>
              <span>Kategoria</span>
              <span>Dostępna ilość</span>
            </div>
            {filteredParts.length === 0 && !isLoading ? (
              <div className="parts-table__empty">Brak części spełniających kryteria.</div>
            ) : (
              filteredParts.map((part) => {
                const isLow = determineLowStock(part);
                const quantityClassName = isLow
                  ? 'parts-table__cell parts-table__cell--quantity parts-table__cell--warn'
                  : 'parts-table__cell parts-table__cell--quantity parts-table__cell--ok';

                return (
                  <div key={part.id} className="parts-table__row">
                    <span className="parts-table__cell parts-table__cell--code" data-label="Numer katalogowy">
                      {part.catalogNumber}
                    </span>
                    <span className="parts-table__cell" data-label="Nazwa">
                      {part.name}
                    </span>
                    <span className="parts-table__cell" data-label="Kategoria">
                      {part.category ?? '—'}
                    </span>
                    <span className={quantityClassName} data-label="Dostępna ilość">
                      {part.currentQuantity}
                      {part.unit ? ` ${part.unit}` : ''}
                      {typeof part.minimumQuantity === 'number' ? (
                        <span className="parts-table__hint">min: {part.minimumQuantity}</span>
                      ) : null}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
