<?php

namespace App\Exports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Illuminate\Support\Facades\DB;

class StockLevelsExport implements FromCollection, WithHeadings, ShouldAutoSize
{
    public function collection()
    {
        return Product::query()
            ->leftJoin('stock_levels', 'products.id', '=', 'stock_levels.product_id')
            ->select([
                'products.code as kod',
                'products.name as nazwa',
                'products.unit as jednostka',
                DB::raw('(COALESCE(stock_levels.qty_on_hand,0) - COALESCE(stock_levels.qty_reserved,0)) as stan'),
            ])
            ->orderBy('products.name')
            ->get();
    }

    public function headings(): array
    {
        return [
            'Kod',
            'Nazwa',
            'Jednostka',
            'Stan dostępny',
        ];
    }
}
