import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import {
  uploadAlstomComparison,
  applyAlstomAdjustments,
  type AlstomComparisonResponse,
  type ApplyAlstomAdjustmentsResponse,
  type MissingItem,
} from '../api/imports';
import { fetchParts, createPart, updatePart, type Part } from '../api/parts';
import { useAuthContext } from '../context/AuthContext';
import './ImportsPage.css';

type QuantityAdjustmentSelection = {
  partId: string;
  catalogNumber: string;
  name: string | null;
  unit: string | null;
  systemQuantity: number;
  fileQuantity: number;
  difference: number;
  accepted: boolean;
};

type MissingCreatePayload = {
  catalogNumber: string;
  name: string;
  unit: string | null;
  quantity: number;
};

type MissingMapPayload = {
  item: MissingItem;
  part: Part;
  newCatalogNumber: string;
  newName: string;
  updateDetails: boolean;
};

type MissingActionResult = {
  success: boolean;
  error?: string;
};

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(size < 10 && exponent > 0 ? 1 : 0)} ${units[exponent]}`;
}

function formatQuantity(value: number, unit?: string | null) {
  const isInteger = Number.isInteger(value);
  const formatted = isInteger ? value.toString() : value.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatSignedQuantity(value: number, unit?: string | null) {
  if (Math.abs(value) < 0.0001) {
    return unit ? `0 ${unit}` : '0';
  }
  const absolute = Math.abs(value);
  const formatted = Number.isInteger(absolute) ? absolute.toString() : absolute.toFixed(2);
  const prefix = value > 0 ? '+' : '-';
  return unit ? `${prefix}${formatted} ${unit}` : `${prefix}${formatted}`;
}

export function ImportsPage() {
  const { token } = useAuthContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AlstomComparisonResponse | null>(null);
  const [quantityAdjustments, setQuantityAdjustments] = useState<QuantityAdjustmentSelection[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyAlstomAdjustmentsResponse | null>(null);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [bulkCreateError, setBulkCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const selectedCount = quantityAdjustments.filter((item) => item.accepted).length;
  const allSelected = quantityAdjustments.length > 0 && selectedCount === quantityAdjustments.length;
  const hasIndeterminate = selectedCount > 0 && selectedCount < quantityAdjustments.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasIndeterminate;
    }
  }, [hasIndeterminate]);

  const searchParts = useCallback(
    async (search: string) => {
      if (!token) {
        throw new Error('Brak tokenu uwierzytelniającego. Zaloguj się ponownie.');
      }
      const response = await fetchParts(token, {
        search: search.trim() || undefined,
        pageSize: 50,
      });
      return response.items ?? [];
    },
    [token],
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
    setQuantityAdjustments([]);
    setApplyResult(null);
    setApplyError(null);
    setError(null);
  }

  function resetState() {
    setSelectedFile(null);
    setResult(null);
    setQuantityAdjustments([]);
    setApplyResult(null);
    setApplyError(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError('Brak tokenu uwierzytelniającego. Zaloguj się ponownie.');
      return;
    }
    if (!selectedFile) {
      setError('Wybierz plik z raportem magazynowym.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setApplyError(null);
    setApplyResult(null);

    try {
      const response = await uploadAlstomComparison(token, selectedFile);
      setResult(response);
      setQuantityAdjustments(
        response.quantityDifferences.map((item) => ({
          partId: item.partId,
          catalogNumber: item.catalogNumber,
          name: item.name ?? null,
          unit: item.unit ?? null,
          systemQuantity: item.systemQuantity,
          fileQuantity: item.fileQuantity,
          difference: item.difference,
          accepted: true,
        })),
      );
    } catch (err) {
      setResult(null);
      setQuantityAdjustments([]);
      setApplyResult(null);
      setApplyError(null);
      setError(err instanceof Error ? err.message : 'Nie udało się przetworzyć pliku.');
    } finally {
      setIsUploading(false);
    }
  }

  function toggleAdjustment(partId: string, accepted: boolean) {
    setQuantityAdjustments((prev) =>
      prev.map((item) => (item.partId === partId ? { ...item, accepted } : item)),
    );
  }

  function handleSelectAll(next: boolean) {
    setQuantityAdjustments((prev) => prev.map((item) => ({ ...item, accepted: next })));
  }

  const handleCreateMissingItem = useCallback(
    async (index: number, payload: MissingCreatePayload): Promise<MissingActionResult> => {
      if (!token) {
        return { success: false, error: 'Brak tokenu uwierzytelniającego. Zaloguj się ponownie.' };
      }
      if (!result) {
        return { success: false, error: 'Brak danych porównania.' };
      }

      try {
        const normalizedUnit = payload.unit ? payload.unit.trim().toLowerCase() : undefined;

        await createPart(token, {
          catalogNumber: payload.catalogNumber.trim(),
          name: payload.name.trim(),
          unit: normalizedUnit,
          currentQuantity: payload.quantity,
        });

        setResult((prev) => {
          if (!prev) {
            return prev;
          }
          const nextMissing = [...prev.missingInSystem];
          nextMissing.splice(index, 1);
          return {
            ...prev,
            summary: {
              ...prev.summary,
              missingCount: Math.max(prev.summary.missingCount - 1, 0),
              totalSystemItems: prev.summary.totalSystemItems + 1,
            },
            missingInSystem: nextMissing,
          };
        });

        setApplyResult(null);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : 'Nie udało się dodać nowej części. Spróbuj ponownie.',
        };
      }
    },
    [result, token],
  );

  const handleMapMissingItem = useCallback(
    async (index: number, payload: MissingMapPayload): Promise<MissingActionResult> => {
      if (!token) {
        return { success: false, error: 'Brak tokenu uwierzytelniającego. Zaloguj się ponownie.' };
      }
      if (!result) {
        return { success: false, error: 'Brak danych porównania.' };
      }

      let updatedPart: Part = payload.part;

      try {
        if (
          payload.updateDetails &&
          (payload.newCatalogNumber.trim() !== payload.part.catalogNumber ||
            payload.newName.trim() !== payload.part.name)
        ) {
          const response = await updatePart(token, payload.part.id, {
            catalogNumber: payload.newCatalogNumber.trim(),
            name: payload.newName.trim(),
          });
          updatedPart = response.part;
        }
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : 'Nie udało się zaktualizować danych części.',
        };
      }

      const systemQuantity = updatedPart.currentQuantity;
      const difference = payload.item.quantity - systemQuantity;

      setResult((prev) => {
        if (!prev) {
          return prev;
        }

        const nextMissing = [...prev.missingInSystem];
        nextMissing.splice(index, 1);

        const filteredDifferences = prev.quantityDifferences.filter(
          (entry) => entry.partId !== updatedPart.id,
        );

        const filteredExtra = prev.extraInSystem.filter(
          (entry) =>
            entry.catalogNumber !== originalCatalogNumber &&
            entry.catalogNumber !== updatedPart.catalogNumber,
        );

        const shouldAddDifference = Math.abs(difference) > 0.0001;
        if (shouldAddDifference) {
          filteredDifferences.push({
            partId: updatedPart.id,
            catalogNumber: updatedPart.catalogNumber,
            name: updatedPart.name,
            unit: updatedPart.unit,
            systemQuantity,
            fileQuantity: payload.item.quantity,
            difference,
          });
        }

        return {
          ...prev,
          summary: {
            ...prev.summary,
            missingCount: Math.max(prev.summary.missingCount - 1, 0),
            quantityMismatchCount: filteredDifferences.length,
            extraCount: filteredExtra.length,
          },
          missingInSystem: nextMissing,
          extraInSystem: filteredExtra,
          quantityDifferences: filteredDifferences,
        };
      });

      setQuantityAdjustments((prev) => {
        const others = prev.filter((entry) => entry.partId !== updatedPart.id);
        if (Math.abs(difference) <= 0.0001) {
          return others;
        }
        return [
          ...others,
          {
            partId: updatedPart.id,
            catalogNumber: updatedPart.catalogNumber,
            name: updatedPart.name ?? null,
            unit: updatedPart.unit ?? null,
            systemQuantity,
            fileQuantity: payload.item.quantity,
            difference,
            accepted: true,
          },
        ];
      });

      setApplyResult(null);
      return { success: true };
    },
    [result, token],
  );

  const handleIgnoreMissingItem = useCallback(
    (index: number) => {
      setResult((prev) => {
        if (!prev) {
          return prev;
        }
        const nextMissing = [...prev.missingInSystem];
        nextMissing.splice(index, 1);
        return {
          ...prev,
          summary: {
            ...prev.summary,
            missingCount: Math.max(prev.summary.missingCount - 1, 0),
          },
          missingInSystem: nextMissing,
        };
      });
      setApplyResult(null);
    },
    [],
  );

  async function handleApplyAdjustments() {
    if (!token) {
      setApplyError('Brak tokenu uwierzytelniającego. Zaloguj się ponownie.');
      return;
    }

    const selected = quantityAdjustments.filter((item) => item.accepted);
    if (selected.length === 0) {
      setApplyError('Zaznacz pozycje, które chcesz zaktualizować.');
      return;
    }

    setIsApplying(true);
    setApplyError(null);

    try {
      const response = await applyAlstomAdjustments(
        token,
        selected.map((item) => ({
          partId: item.partId,
          catalogNumber: item.catalogNumber,
          fileQuantity: item.fileQuantity,
        })),
      );

      setApplyResult(response);

      const processedIds = new Set<string>();
      response.applied.forEach((item) => processedIds.add(item.partId));
      response.skipped.forEach((item) => {
        if (item.partId) {
          processedIds.add(item.partId);
        }
      });

      if (processedIds.size > 0) {
        setQuantityAdjustments((prev) => prev.filter((item) => !processedIds.has(item.partId)));
        setResult((prev) => {
          if (!prev) {
            return prev;
          }
          const remainingDifferences = prev.quantityDifferences.filter(
            (diff) => !processedIds.has(diff.partId),
          );
          return {
            ...prev,
            summary: {
              ...prev.summary,
              quantityMismatchCount: remainingDifferences.length,
            },
            quantityDifferences: remainingDifferences,
          };
        });
      }
    } catch (err) {
      setApplyResult(null);
      setApplyError(err instanceof Error ? err.message : 'Nie udało się zapisać zmian.');
    } finally {
      setIsApplying(false);
    }
  }

  const missingItems = result?.missingInSystem ?? [];

  const handleCreateAllMissing = useCallback(async () => {
    if (!token) {
      setBulkCreateError('Brak tokenu uwierzytelniającego. Zaloguj się ponownie.');
      return;
    }

    if (!result || result.missingInSystem.length === 0) {
      return;
    }

    setIsBulkCreating(true);
    setBulkCreateError(null);

    try {
      const itemsToCreate = [...result.missingInSystem];

      for (const item of itemsToCreate) {
        const normalizedUnit = item.unit ? item.unit.trim().toLowerCase() : undefined;

        await createPart(token, {
          catalogNumber: item.catalogNumber.trim(),
          name: (item.name ?? '').trim() || item.catalogNumber.trim(),
          unit: normalizedUnit,
          currentQuantity: item.quantity,
        });

        setResult((prev) => {
          if (!prev) {
            return prev;
          }

          const indexToRemove = prev.missingInSystem.findIndex(
            (candidate) =>
              candidate.catalogNumber === item.catalogNumber &&
              Math.abs(candidate.quantity - item.quantity) < 0.0001,
          );

          if (indexToRemove === -1) {
            return prev;
          }

          const nextMissing = [...prev.missingInSystem];
          nextMissing.splice(indexToRemove, 1);

          return {
            ...prev,
            summary: {
              ...prev.summary,
              missingCount: Math.max(prev.summary.missingCount - 1, 0),
              totalSystemItems: prev.summary.totalSystemItems + 1,
            },
            missingInSystem: nextMissing,
          };
        });
      }

      setApplyResult(null);
    } catch (err) {
      setBulkCreateError(
        err instanceof Error ? err.message : 'Nie udało się dodać wszystkich pozycji. Spróbuj ponownie.',
      );
    } finally {
      setIsBulkCreating(false);
    }
  }, [result, token]);

  return (
    <div className="imports-page">
      <header className="imports-page__header">
        <div>
          <h1>Porównanie stanów magazynowych</h1>
          <p>Wgraj raport z SAP (plik Excel), aby sprawdzić różnice względem danych w systemie.</p>
        </div>
      </header>

      <section className="imports-page__upload">
        <form onSubmit={handleSubmit} className="imports-form">
          <label className="file-drop">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="file-drop__content">
              <strong>Przeciągnij i upuść plik lub kliknij, aby wybrać</strong>
              <span>Obsługiwane formaty: XLSX, XLS (maks. 10 MB)</span>
              {selectedFile ? (
                <span className="file-drop__meta">
                  {selectedFile.name} · {formatFileSize(selectedFile.size)}
                </span>
              ) : null}
            </div>
          </label>
          <div className="imports-form__actions">
            <button type="submit" className="imports-form__submit" disabled={!selectedFile || isUploading}>
              {isUploading ? 'Przetwarzanie…' : 'Porównaj z systemem'}
            </button>
            {(selectedFile || result) && (
              <button type="button" className="imports-form__reset" onClick={resetState} disabled={isUploading}>
                Wyczyść
              </button>
            )}
          </div>
          {error ? <div className="imports-page__error">{error}</div> : null}
        </form>
      </section>

      {result ? (
        <>
          <section className="imports-page__summary">
            <div className="summary-card">
              <span className="summary-card__label">Pozycje w pliku</span>
              <strong className="summary-card__value">{result.summary.totalFileItems}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Pozycje w systemie</span>
              <strong className="summary-card__value">{result.summary.totalSystemItems}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Braki w systemie</span>
              <strong className="summary-card__value summary-card__value--warn">{result.summary.missingCount}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Nadwyżki w systemie</span>
              <strong className="summary-card__value">{result.summary.extraCount}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Różnice ilościowe</span>
              <strong className="summary-card__value summary-card__value--warn">
                {result.summary.quantityMismatchCount}
              </strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Różnice jednostek</span>
              <strong className="summary-card__value">{result.summary.unitMismatchCount}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Różnice nazw</span>
              <strong className="summary-card__value">{result.summary.nameMismatchCount}</strong>
            </div>
          </section>

          <section className="imports-page__results">
            <div className="imports-panel">
              <div className="imports-panel__header">
                <h2>Korekty ilości</h2>
                <span className="imports-panel__count">{quantityAdjustments.length}</span>
              </div>
              {quantityAdjustments.length === 0 ? (
                <div className="imports-panel__empty">Brak różnic ilościowych wymagających działania.</div>
              ) : (
                <>
                  <div className="imports-adjustments__controls">
                    <label className="imports-adjustments__checkbox imports-adjustments__checkbox--all">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={(event) => handleSelectAll(event.target.checked)}
                      />
                      <span>Zaznacz wszystkie</span>
                    </label>
                    <span className="imports-adjustments__summary">Wybrane: {selectedCount}</span>
                  </div>

                  <div className="imports-table imports-table--adjustments" role="table">
                    <div className="imports-table__row imports-table__row--head" role="row">
                      <span role="columnheader">Akcja</span>
                      <span role="columnheader">Numer katalogowy</span>
                      <span role="columnheader">Nazwa</span>
                      <span role="columnheader">W systemie</span>
                      <span role="columnheader">W pliku</span>
                      <span role="columnheader">Różnica</span>
                    </div>
                    {quantityAdjustments.map((item) => {
                      const diffClass =
                        item.difference > 0
                          ? 'imports-adjustments__diff imports-adjustments__diff--increase'
                          : item.difference < 0
                          ? 'imports-adjustments__diff imports-adjustments__diff--decrease'
                          : 'imports-adjustments__diff';

                      return (
                        <div key={item.partId} className="imports-table__row" role="row">
                          <span data-label="Akcja" role="cell">
                            <label className="imports-adjustments__checkbox">
                              <input
                                type="checkbox"
                                checked={item.accepted}
                                onChange={(event) => toggleAdjustment(item.partId, event.target.checked)}
                              />
                              <span>Aktualizuj</span>
                            </label>
                          </span>
                          <span data-label="Numer katalogowy" role="cell">
                            {item.catalogNumber}
                          </span>
                          <span data-label="Nazwa" role="cell">
                            {item.name ?? '—'}
                          </span>
                          <span data-label="W systemie" role="cell">
                            {formatQuantity(item.systemQuantity, item.unit)}
                          </span>
                          <span data-label="W pliku" role="cell">
                            {formatQuantity(item.fileQuantity, item.unit)}
                          </span>
                          <span data-label="Różnica" role="cell" className={diffClass}>
                            {formatSignedQuantity(item.difference, item.unit)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="imports-adjustments__actions">
                    <button
                      type="button"
                      className="imports-adjustments__apply"
                      onClick={handleApplyAdjustments}
                      disabled={isApplying || selectedCount === 0}
                    >
                      {isApplying ? 'Zapisywanie…' : `Zapisz zmiany (${selectedCount})`}
                    </button>
                    <span className="imports-adjustments__remaining">
                      Pozostałe różnice: {quantityAdjustments.length}
                    </span>
                  </div>
                </>
              )}

              {applyError ? <div className="imports-page__error">{applyError}</div> : null}
              {applyResult ? <ApplyResultSummary result={applyResult} /> : null}
            </div>

            <MissingItemsPanel
              items={missingItems}
              onCreate={handleCreateMissingItem}
              onMap={handleMapMissingItem}
              onIgnore={handleIgnoreMissingItem}
              onSearchParts={searchParts}
              onCreateAll={handleCreateAllMissing}
              isBulkCreating={isBulkCreating}
              bulkCreateError={bulkCreateError}
            />

            <ResultsPanel
              title="Pozycje w systemie nieobecne w pliku"
              emptyLabel="Brak dodatkowych pozycji."
              columns={['Numer katalogowy', 'Nazwa', 'Jednostka', 'Ilość w systemie']}
              rows={result.extraInSystem.map((item) => [
                item.catalogNumber,
                item.name ?? '—',
                item.unit ?? '—',
                item.quantity.toString(),
              ])}
            />

            <ResultsPanel
              title="Różne jednostki"
              emptyLabel="Jednostki zgodne."
              columns={['Numer katalogowy', 'Jednostka w systemie', 'Jednostka w pliku']}
              rows={result.unitMismatches.map((item) => [
                item.catalogNumber,
                item.systemUnit ?? '—',
                item.fileUnit ?? '—',
              ])}
            />

            <ResultsPanel
              title="Różne nazwy"
              emptyLabel="Nazwy zgodne."
              columns={['Numer katalogowy', 'Nazwa w systemie', 'Nazwa w pliku']}
              rows={result.nameDifferences.map((item) => [
                item.catalogNumber,
                item.systemName ?? '—',
                item.fileName ?? '—',
              ])}
            />
          </section>
        </>
      ) : (
        <section className="imports-page__placeholder">
          <p>Wgraj plik z raportem, aby zobaczyć porównanie.</p>
        </section>
      )}
    </div>
  );
}

function ApplyResultSummary({ result }: { result: ApplyAlstomAdjustmentsResponse }) {
  return (
    <div className="imports-page__feedback">
      {result.applied.length > 0 ? (
        <div className="imports-page__success">
          <strong>Zaktualizowano {result.applied.length} pozycji.</strong>
          <ul className="imports-feedback__list">
            {result.applied.slice(0, 5).map((item) => (
              <li key={item.movementId}>
                {item.catalogNumber}
                {item.name ? ` – ${item.name}` : ''} (
                {formatQuantity(item.previousQuantity)} → {formatQuantity(item.newQuantity)})
              </li>
            ))}
            {result.applied.length > 5 ? <li>…</li> : null}
          </ul>
        </div>
      ) : null}

      {result.skipped.length > 0 ? (
        <div className="imports-page__info">
          <strong>Pominięto {result.skipped.length} pozycji.</strong>
          <ul className="imports-feedback__list">
            {result.skipped.map((item, index) => (
              <li key={`${item.catalogNumber}-${index}`}>
                {item.catalogNumber}: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.failed.length > 0 ? (
        <div className="imports-page__warning">
          <strong>Nie udało się zaktualizować {result.failed.length} pozycji:</strong>
          <ul className="imports-feedback__list">
            {result.failed.map((item, index) => (
              <li key={`${item.catalogNumber}-${index}`}>
                {item.catalogNumber}: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

interface MissingItemsPanelProps {
  items: MissingItem[];
  onCreate: (index: number, payload: MissingCreatePayload) => Promise<MissingActionResult>;
  onMap: (index: number, payload: MissingMapPayload) => Promise<MissingActionResult>;
  onIgnore: (index: number) => void;
  onSearchParts: (term: string) => Promise<Part[]>;
  onCreateAll: () => Promise<void>;
  isBulkCreating: boolean;
  bulkCreateError: string | null;
}

function MissingItemsPanel({
  items,
  onCreate,
  onMap,
  onIgnore,
  onSearchParts,
  onCreateAll,
  isBulkCreating,
  bulkCreateError,
}: MissingItemsPanelProps) {
  return (
    <div className="imports-panel">
      <div className="imports-panel__header imports-panel__header--with-action">
        <div className="imports-panel__header-main">
          <h2>Pozycje z pliku nieznalezione w systemie</h2>
          <span className="imports-panel__count">{items.length}</span>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            className="imports-missing__bulk"
            onClick={() => {
              void onCreateAll();
            }}
            disabled={isBulkCreating}
          >
            {isBulkCreating ? 'Dodawanie…' : 'Dodaj wszystkie'}
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="imports-panel__empty">Brak brakujących pozycji.</div>
      ) : (
        <ul className="imports-missing__list">
          {items.map((item, index) => (
            <MissingItemRow
              key={`${item.catalogNumber}-${index}`}
              index={index}
              item={item}
              onCreate={onCreate}
              onMap={onMap}
              onIgnore={onIgnore}
              onSearchParts={onSearchParts}
            />
          ))}
        </ul>
      )}
      {bulkCreateError ? <div className="imports-missing__error imports-missing__error--global">{bulkCreateError}</div> : null}
    </div>
  );
}

interface MissingItemRowProps {
  index: number;
  item: MissingItem;
  onCreate: (index: number, payload: MissingCreatePayload) => Promise<MissingActionResult>;
  onMap: (index: number, payload: MissingMapPayload) => Promise<MissingActionResult>;
  onIgnore: (index: number) => void;
  onSearchParts: (term: string) => Promise<Part[]>;
}

type MissingRowMode = 'idle' | 'create' | 'map';

type MappingState = {
  parts: Part[];
  isLoading: boolean;
  error: string | null;
};

function MissingItemRow({ index, item, onCreate, onMap, onIgnore, onSearchParts }: MissingItemRowProps) {
  const [mode, setMode] = useState<MissingRowMode>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [catalogNumber, setCatalogNumber] = useState(item.catalogNumber);
  const [name, setName] = useState(item.name ?? '');

  const [mappingState, setMappingState] = useState<MappingState>({ parts: [], isLoading: false, error: null });
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [mapCatalogNumber, setMapCatalogNumber] = useState(item.catalogNumber);
  const [mapName, setMapName] = useState(item.name ?? '');
  const [updateDetails, setUpdateDetails] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadParts = useCallback(
    async (term: string) => {
      setMappingState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const parts = await onSearchParts(term);
        setMappingState({ parts, isLoading: false, error: null });

        setSelectedPartId((current) => {
          if (current && parts.some((part) => part.id === current)) {
            return current;
          }
          const fallback = parts[0]?.id ?? '';
          if (fallback) {
            const first = parts[0]!;
            setMapCatalogNumber(item.catalogNumber || first.catalogNumber);
            setMapName(item.name ?? first.name);
          }
          return fallback;
        });
      } catch (err) {
        setMappingState({
          parts: [],
          isLoading: false,
          error: err instanceof Error ? err.message : 'Nie udało się pobrać części.',
        });
      }
    },
    [item.catalogNumber, item.name, onSearchParts],
  );

  useEffect(() => {
    if (mode === 'map') {
      void loadParts('');
    }
  }, [loadParts, mode]);

  function handleStartCreate() {
    setLocalError(null);
    setMode((prevMode) => {
      if (prevMode === 'create') {
        return 'idle';
      }
      setCatalogNumber(item.catalogNumber);
      setName(item.name ?? '');
      return 'create';
    });
  }

  function handleStartMap() {
    setLocalError(null);
    setMode((prevMode) => {
      if (prevMode === 'map') {
        return 'idle';
      }
      setSearchTerm('');
      setUpdateDetails(true);
      setSelectedPartId('');
      return 'map';
    });
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalogNumber.trim() || !name.trim()) {
      setLocalError('Podaj numer katalogowy i nazwę części.');
      return;
    }

    setIsProcessing(true);
    setLocalError(null);

    const response = await onCreate(index, {
      catalogNumber,
      name,
      unit: item.unit ?? null,
      quantity: item.quantity,
    });

    if (!response.success) {
      setLocalError(response.error ?? 'Operacja nie powiodła się.');
    }

    setIsProcessing(false);
  }

  async function handleMapSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPartId) {
      setLocalError('Wybierz część z magazynu.');
      return;
    }

    const selectedPart = mappingState.parts.find((part) => part.id === selectedPartId);
    if (!selectedPart) {
      setLocalError('Nie znaleziono wybranej części.');
      return;
    }

    setIsProcessing(true);
    setLocalError(null);

    const response = await onMap(index, {
      item,
      part: selectedPart,
      newCatalogNumber: mapCatalogNumber,
      newName: mapName,
      updateDetails,
    });

    if (!response.success) {
      setLocalError(response.error ?? 'Operacja nie powiodła się.');
    }

    setIsProcessing(false);
  }

  return (
    <li className="imports-missing__item">
      <div className="imports-missing__header">
        <div className="imports-missing__info">
          <span className="imports-missing__catalog">{item.catalogNumber}</span>
          <span className="imports-missing__name">{item.name ?? 'Brak nazwy w pliku'}</span>
        </div>
        <div className="imports-missing__meta">
          <span>{formatQuantity(item.quantity, item.unit)}</span>
        </div>
      </div>

      <div className="imports-missing__actions">
        <button type="button" onClick={handleStartCreate} className={mode === 'create' ? 'active' : ''}>
          Dodaj nową część
        </button>
        <button type="button" onClick={handleStartMap} className={mode === 'map' ? 'active' : ''}>
          Przypisz do części
        </button>
        <button type="button" onClick={() => onIgnore(index)} className="imports-missing__skip">
          Nie dodawaj
        </button>
      </div>

      {mode === 'create' ? (
        <form className="imports-missing__form" onSubmit={handleCreateSubmit}>
          <label className="imports-missing__field">
            <span>Numer katalogowy</span>
            <input
              value={catalogNumber}
              onChange={(event) => setCatalogNumber(event.target.value)}
              required
            />
          </label>
          <label className="imports-missing__field">
            <span>Nazwa</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="imports-missing__field">
            <span>Jednostka</span>
            <input value={item.unit ?? ''} readOnly placeholder="Brak danych" />
          </label>
          <label className="imports-missing__field">
            <span>Ilość z pliku</span>
            <input value={item.quantity} readOnly />
          </label>
          {localError ? <div className="imports-missing__error">{localError}</div> : null}
          <div className="imports-missing__form-actions">
            <button type="submit" disabled={isProcessing}>
              {isProcessing ? 'Dodawanie…' : 'Zapisz i dodaj'}
            </button>
            <button type="button" onClick={handleStartCreate} disabled={isProcessing}>
              Anuluj
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'map' ? (
        <form className="imports-missing__form" onSubmit={handleMapSubmit}>
          <div className="imports-missing__search">
            <label className="imports-missing__field">
              <span>Szukaj części</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Numer katalogowy lub nazwa"
              />
            </label>
            <button
              type="button"
              onClick={() => loadParts(searchTerm)}
              disabled={mappingState.isLoading}
            >
              {mappingState.isLoading ? 'Szukam…' : 'Szukaj'}
            </button>
          </div>

          {mappingState.error ? (
            <div className="imports-missing__error">{mappingState.error}</div>
          ) : null}

          <label className="imports-missing__field">
            <span>Istniejąca część</span>
            <select
              value={selectedPartId}
              onChange={(event) => {
                const partId = event.target.value;
                setSelectedPartId(partId);
                const selected = mappingState.parts.find((part) => part.id === partId);
                if (selected) {
                  setMapCatalogNumber(item.catalogNumber || selected.catalogNumber);
                  setMapName(item.name ?? selected.name);
                }
              }}
              required
            >
              {mappingState.parts.length === 0 ? (
                <option value="" disabled>
                  Brak wyników wyszukiwania
                </option>
              ) : null}
              {mappingState.parts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.catalogNumber} – {part.name}
                </option>
              ))}
            </select>
          </label>

          <label className="imports-missing__field">
            <span>Nowy numer katalogowy</span>
            <input value={mapCatalogNumber} onChange={(event) => setMapCatalogNumber(event.target.value)} />
          </label>
          <label className="imports-missing__field">
            <span>Nowa nazwa części</span>
            <input value={mapName} onChange={(event) => setMapName(event.target.value)} />
          </label>

          <label className="imports-missing__checkbox">
            <input
              type="checkbox"
              checked={updateDetails}
              onChange={(event) => setUpdateDetails(event.target.checked)}
            />
            <span>Zaktualizuj dane części w magazynie</span>
          </label>

          {localError ? <div className="imports-missing__error">{localError}</div> : null}

          <div className="imports-missing__form-actions">
            <button type="submit" disabled={isProcessing || mappingState.parts.length === 0}>
              {isProcessing ? 'Zapisywanie…' : 'Powiąż i kontynuuj'}
            </button>
            <button type="button" onClick={handleStartMap} disabled={isProcessing}>
              Anuluj
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

interface ResultsPanelProps {
  title: string;
  emptyLabel: string;
  columns: string[];
  rows: string[][];
}

function ResultsPanel({ title, emptyLabel, columns, rows }: ResultsPanelProps) {
  return (
    <div className="imports-panel">
      <div className="imports-panel__header">
        <h2>{title}</h2>
        <span className="imports-panel__count">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="imports-panel__empty">{emptyLabel}</div>
      ) : (
        <div className="imports-table" role="table">
          <div className="imports-table__row imports-table__row--head" role="row">
            {columns.map((column) => (
              <span key={column} role="columnheader">
                {column}
              </span>
            ))}
          </div>
          {rows.map((row, rowIndex) => (
            <div key={`${row[0]}-${rowIndex}`} className="imports-table__row" role="row">
              {row.map((cell, cellIndex) => (
                <span key={`${rowIndex}-${cellIndex}`} data-label={columns[cellIndex]} role="cell">
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
