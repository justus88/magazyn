<?php

namespace App\Filament\Resources\StockDocumentResource\Pages;

use App\Filament\Resources\StockDocumentResource;
use App\Services\StockPostingService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditStockDocument extends EditRecord
{
    protected static string $resource = StockDocumentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),

            Actions\Action::make('confirm')
                ->label('Zatwierdź i zaksięguj')
                ->visible(fn () => $this->record->status === 'draft')
                ->requiresConfirmation()
                ->action(function (StockPostingService $svc) {
                    try {
                        $svc->confirm($this->record);
                        Notification::make()->title('Zaksięgowano.')->success()->send();
                        $this->refreshFormData(['status', 'confirmed_at']);
                    } catch (\Throwable $e) {
                        Notification::make()->title('Błąd')->body($e->getMessage())->danger()->send();
                    }
                }),
        ];
    }
}
