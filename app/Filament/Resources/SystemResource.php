<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SystemResource\Pages;
use App\Models\System;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class SystemResource extends Resource
{
    protected static ?string $model = System::class;
    protected static ?string $navigationLabel = 'Systemy';
    protected static ?string $navigationGroup = 'Magazyn';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')
                ->label('Nazwa')
                ->required()
                ->unique(ignoreRecord: true),
        ])->columns(1);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Nazwa')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->since()->label('Utworzono'),
            ])
            ->actions([Tables\Actions\EditAction::make()])
            ->bulkActions([Tables\Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSystems::route('/'),
            'create' => Pages\CreateSystem::route('/create'),
            'edit' => Pages\EditSystem::route('/{record}/edit'),
        ];
    }
}
