import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { Part, PartsResponse } from './types/inventory';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

function App() {
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchParts() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/parts`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = (await response.json()) as PartsResponse;
        setParts(data.items);
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

  const lowStockParts = useMemo(() => filteredParts.filter((part) => part.availableQuantity <= 0), [filteredParts]);

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
          <strong className="summary-card__value">{filteredParts.length}</strong>
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
              filteredParts.map((part) => (
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
                  <span
                    className={
                      part.availableQuantity > 0
                        ? 'parts-table__cell parts-table__cell--ok'
                        : 'parts-table__cell parts-table__cell--warn'
                    }
                    data-label="Dostępna ilość"
                  >
                    {part.availableQuantity}
                    {part.unit ? ` ${part.unit}` : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
