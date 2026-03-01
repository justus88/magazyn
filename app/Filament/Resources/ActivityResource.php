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

    public static function form(Form $form): Form
    {
        return $form->schema([]); // tylko podgląd
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

                // NEW: Kod / Nazwa z properties (top-level albo properties.attributes.*)
                Tables\Columns\TextColumn::make('item_code')
                    ->label('Kod')
                    ->getStateUsing(function (Activity $record) {
                        $p = $record->properties ?? [];
                        $code = data_get($p, 'code') ?? data_get($p, 'attributes.code') ?? data_get($p, 'old.code');
                        return $code ?: '-';
                    })
                    ->searchable(),

                Tables\Columns\TextColumn::make('item_name')
                    ->label('Nazwa')
                    ->getStateUsing(function (Activity $record) {
                        $p = $record->properties ?? [];
                        $name = data_get($p, 'name') ?? data_get($p, 'attributes.name') ?? data_get($p, 'old.name');
                        return $name ?: '-';
                    })
                    ->wrap()
                    ->searchable(),

                Tables\Columns\TextColumn::make('subject_type')
                    ->label('Model')
                    ->formatStateUsing(fn (?string $state) => $state ? class_basename($state) : '-')
                    ->toggleable(),

                Tables\Columns\TextColumn::make('subject_id')
                    ->label('ID')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('description')
                    ->label('Opis')
                    ->wrap()
                    ->searchable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('event')
                    ->label('Akcja')
                    ->options([
                        'created' => 'created',
                        'updated' => 'updated',
                        'deleted' => 'deleted',
                    ]),

                Tables\Filters\Filter::make('only_products')
                    ->label('Tylko materiały')
                    ->query(fn ($query) => $query->where('subject_type', 'App\Models\Product')),
            ])
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
