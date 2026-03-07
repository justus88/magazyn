<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockDocumentLine extends Model
{
    protected $fillable = ['stock_document_id', 'product_id', 'qty'];

    public function document(): BelongsTo
    {
        return $this->belongsTo(StockDocument::class, 'stock_document_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    protected static function booted(): void
    {
        static::created(function (StockDocumentLine $line) {
            $product = $line->product;
            $document = $line->document;

            if (! $product || ! $document) {
                return;
            }

            $action = $document->type === 'WZ' ? 'wydał' : 'przyjął';
            $event = $document->type === 'WZ' ? 'wydanie' : 'przyjęcie';
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
                ->event($event)
                ->log("{$userName} {$action} {$line->qty} {$product->unit} {$product->name} ({$product->code}) dla {$ktw} dnia {$date}");
        });
    }
}
