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
}
