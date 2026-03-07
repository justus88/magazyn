<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ActivityLogResource\Pages;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Spatie\Activitylog\Models\Activity;

class ActivityLogResource extends Resource
{
    protected static ?string $model = Activity::class;

    protected static ?string $navigationLabel = 'Logi magazynowe';
    protected static ?string $navigationGroup = 'Zarządzanie';
    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn ($query) => $query->where('log_name', 'magazyn')->latest())
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Data')
                    ->dateTime('d-m-Y H:i')
                    ->sortable(),

                Tables\Columns\TextColumn::make('causer.email')
                    ->label('Użytkownik')
                    ->searchable()
                    ->placeholder('-'),

                Tables\Columns\TextColumn::make('event')
                    ->label('Akcja')
                    ->badge()
                    ->sortable()
                    ->placeholder('-'),

                Tables\Columns\TextColumn::make('subject_type')
                    ->label('Model')
                    ->formatStateUsing(fn (?string $state) => match ($state) {
                        'App\Models\Product' => 'Materiał',
                        'App\Models\StockDocument' => 'Dokument',
                        'App\Models\StockDocumentLine' => 'Pozycja dokumentu',
                        'App\Models\StockLevel' => 'Stan magazynowy',
                        default => class_basename((string) $state),
                    })
                    ->searchable(),

                Tables\Columns\TextColumn::make('description')
                    ->label('Opis')
                    ->wrap()
                    ->searchable(),
            ])
            ->filters([
            ])
            ->actions([
            ])
            ->bulkActions([
            ]);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->email === 'justusque@gmail.com';
    }

    public static function canDelete($record): bool
    {
        return auth()->user()?->email === 'justusque@gmail.com';
    }

    public static function canDeleteAny(): bool
    {
        return auth()->user()?->email === 'justusque@gmail.com';
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListActivityLogs::route('/'),
        ];
    }
}
