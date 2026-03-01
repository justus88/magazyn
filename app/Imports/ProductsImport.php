<?php

namespace App\Imports;

use App\Models\Product;
use App\Models\System;
use App\Models\StockLevel;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Concerns\WithStartRow;

class ProductsImport implements ToArray, WithStartRow
{
    public int $created = 0;
    public int $updated = 0;
    public int $levels = 0;
    public int $skipped = 0;

    public function startRow(): int
    {
        return 8; // dane od ROW 8 (zgodnie z debug)
    }

    public function array(array $rows): array
    {
        $system = System::firstOrCreate(['name' => 'Domyślny']);

        $debugCount = 0;

        foreach ($rows as $i => $row) {
            // $row jest zwykłą tablicą 0-based: [A,B,C,D,E,F,...]
            // Z Twojego debug:
            // A=Lp, B=Materiał, C=Krótki tekst, D=Ilość pierwotna, E=SZT, F=Ilość bieżąca

            $code = trim((string)($row[1] ?? ''));   // B
            $name = trim((string)($row[2] ?? ''));   // C
            $unit = trim((string)($row[4] ?? 'SZT')); // E
            $qtyRaw = $row[3] ?? null;               // D  (kol 4 jako stan, jak chcesz)

            if ($debugCount < 3) {
                Log::info('[IMPORT_PRODUCTS] row_sample', [
                    'row_index' => $i,
                    'raw' => $row,
                    'parsed' => ['code' => $code, 'name' => $name, 'unit' => $unit, 'qtyRaw' => $qtyRaw],
                ]);
                $debugCount++;
            }

            if ($code === '' || $name === '') {
                $this->skipped++;
                continue;
            }

            $qty = $this->toInt($qtyRaw);

            $existing = Product::where('code', $code)->first();

            $product = Product::updateOrCreate(
                ['code' => $code],
                [
                    'system_id' => $system->id,
                    'name'      => $name,
                    'unit'      => $unit !== '' ? $unit : 'SZT',
                    'active'    => true,
                ]
            );

            if ($existing) $this->updated++; else $this->created++;

            StockLevel::updateOrCreate(
                ['product_id' => $product->id],
                ['qty_on_hand' => max(0, $qty)]
            );
            $this->levels++;
        }

        return $rows;
    }

    private function toInt($value): int
    {
        if ($value === null) return 0;
        if (is_int($value)) return $value;
        if (is_float($value)) return (int) round($value);

        $s = trim((string) $value);
        if ($s === '') return 0;

        $s = str_replace(["\xC2\xA0", ' '], '', $s);
        $s = str_replace(',', '.', $s);
        $s = preg_replace('/[^0-9\.\-]/', '', $s);

        if ($s === '' || $s === '-' || $s === '.' || $s === '-.') return 0;

        return (int) round((float) $s);
    }
}
