<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Exports\StockLevelsExport;
use App\Imports\ProductsImport;
use App\Models\Product;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/export-stock-levels', function () {
    $filename = 'stany-magazynowe-' . now()->format('d-m-Y') . '.xlsx';

    return Excel::download(new StockLevelsExport(), $filename);
})->middleware('auth')->name('products.export');

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

    if (! is_file($abs)) {
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

Route::post('/management/report', function (Request $request) {
    abort_unless(auth()->check() && in_array(auth()->user()?->email, [
        'justusque@gmail.com',
        'pejot@wp.pl',
    ], true), 403);

    $request->validate([
        'date_from' => ['required', 'date'],
        'date_to' => ['required', 'date', 'after_or_equal:date_from'],
    ]);

    $dateFrom = $request->input('date_from');
    $dateTo = $request->input('date_to');

    $rows = DB::table('stock_document_lines')
        ->join('stock_documents', 'stock_document_lines.stock_document_id', '=', 'stock_documents.id')
        ->join('products', 'stock_document_lines.product_id', '=', 'products.id')
        ->leftJoin('users', 'stock_documents.created_by', '=', 'users.id')
        ->where('stock_documents.type', 'WZ')
        ->whereBetween('stock_documents.document_date', [$dateFrom, $dateTo])
        ->orderBy('stock_documents.document_date')
        ->orderBy('stock_documents.number')
        ->select([
            'stock_documents.document_date',
            'stock_documents.number as ktw',
            'products.code',
            'products.name',
            'products.unit',
            'stock_document_lines.qty',
            'users.name as user_name',
        ])
        ->get();

    $pdf = Pdf::loadView('management.report-pdf', [
        'rows' => $rows,
        'dateFrom' => \Carbon\Carbon::parse($dateFrom)->format('d-m-Y'),
        'dateTo' => \Carbon\Carbon::parse($dateTo)->format('d-m-Y'),
    ])->setPaper('a4', 'portrait');

    $filename = 'raport-' .
        \Carbon\Carbon::parse($dateFrom)->format('d-m-Y') .
        '-do-' .
        \Carbon\Carbon::parse($dateTo)->format('d-m-Y') .
        '.pdf';

    return $pdf->download($filename);
})->middleware('auth')->name('management.report.generate');
