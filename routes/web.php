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
