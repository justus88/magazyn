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
}
