<?php

namespace App\Filament\Resources;

use App\Filament\Resources\StockDocumentResource\Pages;
use App\Models\StockDocument;
use App\Models\StockLevel;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class StockDocumentResource extends Resource
{
    protected static ?string $model = StockDocument::class;
    protected static ?string $navigationLabel = 'Dokumenty PZ/WZ';
    protected static ?string $navigationGroup = 'Magazyn';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('number')
                ->label('Numer zgłoszenia / KTW')
                ->required()
                ->unique(ignoreRecord: true),

            Forms\Components\Select::make('type')
                ->label('Typ')
                ->options(['PZ' => 'PZ (Przychód)', 'WZ' => 'WZ (Rozchód)'])
                ->required()
                ->reactive(),

            Forms\Components\DatePicker::make('document_date')
                ->label('Data')
                ->required()
                ->default(now()),

            Forms\Components\Hidden::make('created_by')
                ->default(fn () => auth()->id()),

            Forms\Components\Placeholder::make('status')
                ->label('Status')
                ->content(fn ($record) => match ($record?->status ?? 'draft') {
                    'confirmed' => 'Zatwierdzony',
                    default => 'Roboczy',
                }),

            Forms\Components\Repeater::make('lines')
                ->label('Pozycje')
                ->relationship()
                ->columnSpanFull()
                ->schema([
                    Forms\Components\Select::make('product_id')
                        ->label('Część / materiał')
                        ->relationship(
                            name: 'product',
                            titleAttribute: 'code',
                            modifyQueryUsing: fn ($query) => $query->orderBy('code')
                        )
                        ->getOptionLabelFromRecordUsing(fn ($record) => "{$record->code} - {$record->name}")
                        ->searchable(['code', 'name'])
                        ->preload()
                        ->required()
                        ->reactive(),

                    Forms\Components\Placeholder::make('on_hand')
                        ->label('Stan (na magazynie)')
                        ->content(function (callable $get) {
                            $productId = $get('product_id');

                            if (! $productId) {
                                return '-';
                            }

                            $qty = StockLevel::query()
                                ->where('product_id', $productId)
                                ->value('qty_on_hand');

                            return (string) ($qty ?? 0);
                        })
                        ->visible(fn (callable $get) => $get('../../type') === 'WZ'),

                    Forms\Components\TextInput::make('qty')
                        ->label('Ilość')
                        ->numeric()
                        ->minValue(1)
                        ->required()
                        ->rule(function (callable $get) {
                            return function (string $attribute, $value, \Closure $fail) use ($get) {
                                $type = $get('../../type');

                                if ($type !== 'WZ') {
                                    return;
                                }

                                $productId = $get('product_id');

                                if (! $productId) {
                                    return;
                                }

                                $onHand = StockLevel::query()
                                    ->where('product_id', $productId)
                                    ->value('qty_on_hand') ?? 0;

                                if ((int) $value > (int) $onHand) {
                                    $fail("Brak stanu. Na magazynie: {$onHand}.");
                                }
                            };
                        }),
                ])
                ->minItems(1)
                ->columns(2),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('number')
                    ->label('Numer')
                    ->sortable()
                    ->searchable(),

                Tables\Columns\TextColumn::make('type')
                    ->label('Typ')
                    ->sortable(),

                Tables\Columns\TextColumn::make('document_date')
                    ->label('Data')
                    ->date()
                    ->sortable(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'confirmed' => 'Zatwierdzony',
                        default => 'Roboczy',
                    }),

                Tables\Columns\TextColumn::make('confirmed_at')
                    ->label('Zatwierdzono')
                    ->dateTime()
                    ->since(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->options([
                        'PZ' => 'PZ',
                        'WZ' => 'WZ',
                    ])
                    ->label('Typ'),

                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'draft' => 'Roboczy',
                        'confirmed' => 'Zatwierdzony',
                    ])
                    ->label('Status'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListStockDocuments::route('/'),
            'create' => Pages\CreateStockDocument::route('/create'),
            'edit' => Pages\EditStockDocument::route('/{record}/edit'),
        ];
    }
}
