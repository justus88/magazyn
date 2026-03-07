<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Exports\StockLevelsExport;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/export-stock-levels', function () {

    $filename = 'stany-magazynowe-' . now()->format('d-m-Y') . '.xlsx';

    return Excel::download(new StockLevelsExport(), $filename);

})->middleware('auth')->name('products.export');


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
