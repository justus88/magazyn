<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockLevel extends Model
{
    protected $fillable = ['product_id', 'qty_on_hand', 'qty_reserved'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
