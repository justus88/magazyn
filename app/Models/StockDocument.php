<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class StockDocument extends Model
{
    use LogsActivity;

    protected $fillable = ['number', 'type', 'document_date', 'status', 'created_by', 'confirmed_at'];

    protected $casts = [
        'document_date' => 'date',
        'confirmed_at' => 'datetime',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(StockDocumentLine::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('magazyn')
            ->logOnly(['number', 'type', 'document_date', 'status', 'created_by', 'confirmed_at'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
