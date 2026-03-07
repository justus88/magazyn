<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Product extends Model
{
    use LogsActivity;

    protected $fillable = [
        'system_id',
        'code',
        'name',
        'unit',
        'active',
    ];

    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function stockLevel(): HasOne
    {
        return $this->hasOne(StockLevel::class);
    }

    public function stockDocumentLines(): HasMany
    {
        return $this->hasMany(StockDocumentLine::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
	    ->useLogName('magazyn')
            ->logOnly(['system_id', 'code', 'name', 'unit', 'active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    protected static function booted(): void
    {
        static::deleted(function (Product $product) {
            activity()
                ->performedOn($product)
                ->causedBy(Auth::user())
                ->withProperties([
                    'system' => $product->system_id,
                    'code' => $product->code,
                    'name' => $product->name,
                    'unit' => $product->unit,
                    'active' => $product->active,
                ])
                ->event('deleted')
                ->log("Usunięto materiał {$product->code} - {$product->name}");
        });
    }
}
