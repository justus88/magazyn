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
        return $form->schema([]);
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
