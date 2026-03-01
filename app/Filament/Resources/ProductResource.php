<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Imports\ProductsImport;
use App\Models\Product;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Tables\Actions\Action;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static ?string $navigationLabel = 'Materiały';
    protected static ?string $navigationGroup = 'Magazyn';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Select::make('system_id')
                ->label('System')
                ->relationship('system', 'name')
                ->searchable()
                ->preload()
                ->required(),

            Forms\Components\TextInput::make('code')
                ->label('Kod materiału')
                ->required()
                ->unique(ignoreRecord: true),

            Forms\Components\TextInput::make('name')
                ->label('Nazwa')
                ->required(),

            Forms\Components\TextInput::make('unit')
                ->label('Jednostka')
                ->default('SZT')
                ->required(),

            Forms\Components\Toggle::make('active')
                ->label('Aktywny')
                ->default(true),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('system.name')->label('System')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('code')->label('Kod')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('name')->label('Nazwa')->wrap()->sortable()->searchable(),
                Tables\Columns\TextColumn::make('unit')->label('J.m.')->sortable(),
                Tables\Columns\IconColumn::make('active')->label('Aktywny')->boolean(),
            ])
            ->headerActions([
                Action::make('import')
                    ->label('Import z Excel')
                    ->color('primary')
                    ->icon('heroicon-o-arrow-up-tray')
                    ->form([
                        FileUpload::make('file')
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
                        try {
                            $rel = $data['file'] ?? null;
                            if (!$rel) {
                                throw new \RuntimeException('Nie wybrano pliku.');
                            }

                            $disk = Storage::disk('local');
                            $abs = $disk->path($rel);

                            if (!is_file($abs)) {
                                throw new \RuntimeException("Plik nie istnieje na dysku: {$abs}");
                            }

                            $before = Product::count();
                            $import = new ProductsImport();

                            Log::info('[IMPORT_PRODUCTS] start', [
                                'rel' => $rel,
                                'abs' => $abs,
                                'size' => filesize($abs),
                                'before_products' => $before,
                            ]);

                            Excel::import($import, $abs);

                            $after = Product::count();

                            Log::info('[IMPORT_PRODUCTS] done', [
                                'created' => $import->created,
                                'updated' => $import->updated,
                                'levels'  => $import->levels,
                                'skipped' => $import->skipped,
                                'after_products' => $after,
                            ]);

                            Notification::make()
                                ->title('Import zakończony')
                                ->body("Dodano: {$import->created}, zaktualizowano: {$import->updated}, ustawiono stanów: {$import->levels}, pominięto: {$import->skipped}. Produkty: {$before} → {$after}.")
                                ->success()
                                ->send();
                        } catch (\Throwable $e) {
                            Log::error('[IMPORT_PRODUCTS] ERROR', [
                                'msg' => $e->getMessage(),
                                'trace' => $e->getTraceAsString(),
                            ]);

                            Notification::make()
                                ->title('Import NIEUDANY')
                                ->body($e->getMessage() . " (szczegóły w storage/logs/laravel.log)")
                                ->danger()
                                ->send();

                            throw $e;
                        }
                    }),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),

                Action::make('hardDelete')
                    ->label('Usuń (na twardo)')
                    ->color('danger')
                    ->icon('heroicon-o-trash')
                    ->visible(fn (Product $record) => !$record->stockDocumentLines()->exists())
                    ->modalHeading('Potwierdź usunięcie materiału')
                    ->modalDescription('To usunie materiał NA STAŁE. Operacja nieodwracalna.')
                    ->form([
                        Checkbox::make('i_understand')->label('Rozumiem, że to usunie rekord na stałe')->required(),
                        TextInput::make('confirm_text')->label('Wpisz: USUN')->required(),
                    ])
                    ->action(function (Product $record, array $data) {
                        if (($data['confirm_text'] ?? '') !== 'USUN') {
                            Notification::make()->title('Błąd')->body('Musisz wpisać dokładnie: USUN')->danger()->send();
                            return;
                        }

                        if ($record->stockDocumentLines()->exists()) {
                            Notification::make()->title('Nie można usunąć')->body('Materiał był użyty w dokumentach. Ustaw Aktywny = OFF.')->danger()->send();
                            return;
                        }

                        try {
                            $record->delete();
                            Notification::make()->title('Usunięto')->success()->send();
                        } catch (\Throwable $e) {
                            Notification::make()->title('Błąd')->body($e->getMessage())->danger()->send();
                        }
                    }),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit' => Pages\EditProduct::route('/{record}/edit'),
        ];
    }
}
