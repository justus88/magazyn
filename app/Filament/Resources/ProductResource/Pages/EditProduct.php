<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use App\Models\Product;
use Filament\Actions;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditProduct extends EditRecord
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Celowo NIE dodajemy DeleteAction, bo FK RESTRICT i historia magazynu.

            Actions\Action::make('hardDelete')
                ->label('Usuń (na twardo)')
                ->color('danger')
                ->icon('heroicon-o-trash')
                ->visible(fn () => ! $this->record->stockDocumentLines()->exists())
                ->modalHeading('Potwierdź usunięcie materiału')
                ->modalDescription('To usunie materiał NA STAŁE. Operacja nieodwracalna.')
                ->form([
                    Checkbox::make('i_understand')
                        ->label('Rozumiem, że to usunie rekord na stałe')
                        ->required(),
                    TextInput::make('confirm_text')
                        ->label('Wpisz: USUN')
                        ->required(),
                ])
                ->action(function (array $data) {
                    /** @var Product $product */
                    $product = $this->record;

                    if (($data['confirm_text'] ?? '') !== 'USUN') {
                        Notification::make()->title('Błąd')->body('Musisz wpisać dokładnie: USUN')->danger()->send();
                        return;
                    }

                    if ($product->stockDocumentLines()->exists()) {
                        Notification::make()
                            ->title('Nie można usunąć')
                            ->body('Materiał był użyty w dokumentach. Ustaw Aktywny = OFF.')
                            ->danger()
                            ->send();
                        return;
                    }

                    try {
                        $product->delete();

                        Notification::make()->title('Usunięto')->success()->send();

                        $this->redirect(ProductResource::getUrl('index'));
                    } catch (\Throwable $e) {
                        Notification::make()->title('Błąd')->body($e->getMessage())->danger()->send();
                    }
                }),
        ];
    }
}
