<?php

namespace App\Services;

use App\Models\StockDocument;
use App\Models\StockLevel;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class StockPostingService
{
    public function confirm(StockDocument $doc): void
    {
        if ($doc->status !== 'draft') {
            throw new RuntimeException('Dokument nie jest w wersji roboczej.');
        }

        $doc->load('lines.product');

        DB::transaction(function () use ($doc) {
            foreach ($doc->lines as $line) {
                $level = StockLevel::query()
                    ->lockForUpdate()
                    ->firstOrCreate(
                        ['product_id' => $line->product_id],
                        ['qty_on_hand' => 0, 'qty_reserved' => 0]
                    );

                if ($doc->type === 'WZ') {
                    if ($level->qty_on_hand < $line->qty) {
                        throw new RuntimeException("Brak stanu dla: {$line->product->code} ({$line->product->name}).");
                    }
                    $level->qty_on_hand -= $line->qty;
                } else { // PZ
                    $level->qty_on_hand += $line->qty;
                }

                $level->save();
            }

            $doc->status = 'confirmed';
            $doc->confirmed_at = now();
            $doc->save();
        });
    }
}
