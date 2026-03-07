<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

use App\Exports\StockLevelsExport;
use Maatwebsite\Excel\Facades\Excel;

Route::get('/export-stock-levels', function () {

    $filename = 'stany-magazynowe-' . now()->format('d-m-Y') . '.xlsx';

    return Excel::download(new StockLevelsExport(), $filename);

})->middleware('auth')->name('products.export');

use App\Imports\ProductsImport;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

Route::get('/management/import', function () {
    abort_unless(auth()->check() && auth()->user()?->email === 'justusque@gmail.com', 403);

    return view('management.import');
})->middleware('auth')->name('management.import');

Route::post('/management/import', function (Request $request) {
    abort_unless(auth()->check() && auth()->user()?->email === 'justusque@gmail.com', 403);

    $request->validate([
        'file' => ['required', 'file', 'mimes:xlsx,csv'],
    ]);

    $rel = $request->file('file')->store('imports', 'local');
    $abs = Storage::disk('local')->path($rel);

    if (!is_file($abs)) {
        return back()->withErrors(['file' => 'Plik nie został poprawnie zapisany.']);
    }

    $before = Product::count();
    $import = new ProductsImport();

    Log::info('[IMPORT_PRODUCTS] start', [
        'rel' => $rel,
        'abs' => $abs,
        'size' => filesize($abs),
        'before_products' => $before,
        'user' => auth()->user()?->email,
    ]);

    Excel::import($import, $abs);

    $after = Product::count();

    Log::info('[IMPORT_PRODUCTS] done', [
        'created' => $import->created,
        'updated' => $import->updated,
        'levels' => $import->levels,
        'skipped' => $import->skipped,
        'after_products' => $after,
        'user' => auth()->user()?->email,
    ]);

    return redirect()
        ->route('management.import')
        ->with('success', "Import zakończony. Dodano: {$import->created}, zaktualizowano: {$import->updated}, ustawiono stanów: {$import->levels}, pominięto: {$import->skipped}.");
})->middleware('auth')->name('management.import.post');

Route::get('/management/report', function () {
    abort_unless(auth()->check() && in_array(auth()->user()?->email, [
        'justusque@gmail.com',
        'pejot@wp.pl',
    ], true), 403);

    return view('management.report');
})->middleware('auth')->name('management.report');

Route::post('/management/report', function (\Illuminate\Http\Request $request) {
    abort_unless(auth()->check() && in_array(auth()->user()?->email, [
        'justusque@gmail.com',
        'pejot@wp.pl',
    ], true), 403);

    $request->validate([
        'date_from' => ['required', 'date'],
        'date_to' => ['required', 'date', 'after_or_equal:date_from'],
    ]);

    return back()->withErrors(['date_from' => 'Generator PDF dodamy w następnym kroku.']);
})->middleware('auth')->name('management.report.generate');
