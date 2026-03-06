<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

use App\Exports\StockLevelsExport;
use Maatwebsite\Excel\Facades\Excel;

Route::get('/export-stock-levels', function () {
    return Excel::download(new StockLevelsExport(), 'stany-magazynowe.xlsx');
})->middleware('auth')->name('products.export');
