<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockDocument extends Model
{
    protected $fillable = ['number', 'type', 'document_date', 'status', 'created_by', 'confirmed_at'];

    protected $casts = [
        'document_date' => 'date',
        'confirmed_at' => 'datetime',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(StockDocumentLine::class);
    }

    protected static function booted(): void
    {
        static::created(function (StockDocument $document) {
            $userName = auth()->user()?->name ?? auth()->user()?->email ?? 'Użytkownik';
            $date = $document->document_date?->format('d-m-Y') ?? now()->format('d-m-Y');

            activity('magazyn')
                ->performedOn($document)
                ->causedBy(auth()->user())
                ->withProperties([
                    'number' => $document->number,
                    'type' => $document->type,
                    'date' => $date,
                    'status' => $document->status,
                ])
                ->event('utworzenie_dokumentu')
                ->log("{$userName} utworzył dokument {$document->type} {$document->number} dnia {$date}");
        });

        static::updated(function (StockDocument $document) {
            $userName = auth()->user()?->name ?? auth()->user()?->email ?? 'Użytkownik';
            $date = $document->document_date?->format('d-m-Y') ?? now()->format('d-m-Y');

            $changed = array_keys($document->getChanges());

            // Pomijamy tylko timestamps
            $meaningfulChanges = array_diff($changed, ['updated_at']);

            if (empty($meaningfulChanges)) {
                return;
            }

            $description = "{$userName} zaktualizował dokument {$document->type} {$document->number} dnia {$date}";

            if (in_array('status', $meaningfulChanges, true) && $document->status === 'confirmed') {
                $description = "{$userName} zatwierdził dokument {$document->type} {$document->number} dnia {$date}";
            }

            activity('magazyn')
                ->performedOn($document)
                ->causedBy(auth()->user())
                ->withProperties([
                    'number' => $document->number,
                    'type' => $document->type,
                    'date' => $date,
                    'status' => $document->status,
                    'changed_fields' => array_values($meaningfulChanges),
                ])
                ->event('aktualizacja_dokumentu')
                ->log($description);
        });

        static::deleted(function (StockDocument $document) {
            $userName = auth()->user()?->name ?? auth()->user()?->email ?? 'Użytkownik';
            $date = $document->document_date?->format('d-m-Y') ?? now()->format('d-m-Y');

            activity('magazyn')
                ->performedOn($document)
                ->causedBy(auth()->user())
                ->withProperties([
                    'number' => $document->number,
                    'type' => $document->type,
                    'date' => $date,
                ])
                ->event('usuniecie_dokumentu')
                ->log("{$userName} usunął dokument {$document->type} {$document->number} dnia {$date}");
        });
    }
}
