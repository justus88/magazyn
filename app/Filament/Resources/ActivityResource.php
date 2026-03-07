<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ActivityResource\Pages;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Spatie\Activitylog\Models\Activity;

class ActivityResource extends Resource
{
    protected static ?string $model = Activity::class;

    protected static ?string $navigationLabel = 'Logi';
    protected static ?string $navigationGroup = 'Administracja';
    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';

    // UKRYWA RESOURCE Z MENU
    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Kiedy')
                    ->dateTime('Y-m-d H:i:s')
                    ->sortable(),

                Tables\Columns\TextColumn::make('causer.email')
                    ->label('Kto')
                    ->searchable(),

                Tables\Columns\TextColumn::make('event')
                    ->label('Akcja')
                    ->badge()
                    ->sortable(),

                Tables\Columns\TextColumn::make('description')
                    ->label('Opis')
                    ->wrap()
                    ->searchable(),
            ])
            ->filters([])
            ->actions([
                Tables\Actions\ViewAction::make()->label('Szczegóły'),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListActivities::route('/'),
            'view' => Pages\ViewActivity::route('/{record}'),
        ];
    }
}
