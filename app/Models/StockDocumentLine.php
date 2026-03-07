<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class StockDocumentLine extends Model
{
    use LogsActivity;

    protected $fillable = ['stock_document_id', 'product_id', 'qty'];

    public function document(): BelongsTo
    {
        return $this->belongsTo(StockDocument::class, 'stock_document_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('magazyn')
            ->logOnly(['stock_document_id', 'product_id', 'qty'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    protected static function booted(): void
    {
        static::created(function (StockDocumentLine $line) {
            $product = $line->product;
            $document = $line->document;

            if (!$product || !$document) {
                return;
            }

            $action = $document->type === 'WZ' ? 'wydał' : 'przyjął';
            $date = $document->document_date?->format('d-m-Y') ?? now()->format('d-m-Y');
            $ktw = $document->number ?? '-';
            $userName = auth()->user()?->name ?? 'Użytkownik';

            activity()
                ->useLogName('magazyn')
                ->performedOn($line)
                ->causedBy(auth()->user())
                ->withProperties([
                    'ktw' => $ktw,
                    'date' => $date,
                    'code' => $product->code,
                    'name' => $product->name,
                    'unit' => $product->unit,
                    'qty' => $line->qty,
                    'type' => $document->type,
                ])
                ->event($document->type === 'WZ' ? 'wydanie' : 'przyjecie')
                ->log(
                    "{$userName} {$action} {$line->qty} {$product->unit} {$product->name} ({$product->code}) dla {$ktw} dnia {$date}"
                );
        });
    }
}
