<?php

namespace App\Filament\Resources;

use App\Filament\Resources\StockLevelResource\Pages;
use App\Models\StockLevel;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class StockLevelResource extends Resource
{
    protected static ?string $model = StockLevel::class;
    protected static ?string $navigationLabel = 'Stany magazynowe';
    protected static ?string $navigationGroup = 'Magazyn';

    public static function form(Form $form): Form
    {
        return $form->schema([]); // tylko podgląd
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('product.system.name')->label('System')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('product.code')->label('Kod')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('product.name')->label('Nazwa')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('qty_on_hand')->label('Stan')->sortable(),
            ])
->headerActions([

    Tables\Actions\Action::make('import')
        ->label('Import z Excel')
        ->visible(fn () => auth()->user()?->email === 'justusque@gmail.com')
        ->color('primary')
        ->icon('heroicon-o-arrow-up-tray')
        ->form([
            \Filament\Forms\Components\FileUpload::make('file')
                ->label('Plik XLSX / CSV')
                ->required()
                ->acceptedFileTypes([
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'text/csv',
                ])
                ->disk('local')
                ->directory('imports'),
        ])
        ->action(function (array $data) {

            $rel = $data['file'] ?? null;

            if (!$rel) {
                throw new \RuntimeException('Nie wybrano pliku.');
            }

            $abs = \Storage::disk('local')->path($rel);

            \Maatwebsite\Excel\Facades\Excel::import(new \App\Imports\ProductsImport(), $abs);
        }),

    Tables\Actions\Action::make('export')
        ->label('Export do Excel')
        ->icon('heroicon-o-arrow-down-tray')
        ->color('success')
        ->url(fn (): string => route('products.export'))
        ->openUrlInNewTab(),

])
            ->filters([
                Tables\Filters\SelectFilter::make('system')
                    ->relationship('product.system', 'name')
                    ->label('System'),
            ])
            ->actions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListStockLevels::route('/'),
        ];
    }
}
