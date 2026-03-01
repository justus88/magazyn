<?php

namespace App\Console\Commands;

use App\Imports\ProductsImport;
use Illuminate\Console\Command;
use Maatwebsite\Excel\Facades\Excel;

class ImportProducts extends Command
{
    protected $signature = 'import:products {file : Ścieżka do CSV/XLSX (np. storage/app/import/products.xlsx)}';
    protected $description = 'Import materiałów (Products) + systemów z pliku CSV/XLSX (nagłówki: system, code, name, unit, active)';

    public function handle(): int
    {
        $file = $this->argument('file');

        if (!is_file($file)) {
            $this->error("Nie znaleziono pliku: {$file}");
            $this->info("Tip: wrzuć plik do storage/app/import i podaj ścieżkę storage/app/import/NAZWA.xlsx");
            return self::FAILURE;
        }

        Excel::import(new ProductsImport(), $file);

        $this->info('OK: import zakończony.');
        return self::SUCCESS;
    }
}
