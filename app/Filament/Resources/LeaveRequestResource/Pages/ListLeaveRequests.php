<?php

namespace App\Filament\Resources\LeaveRequestResource\Pages;

use App\Filament\Resources\LeaveRequestResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListLeaveRequests extends ListRecords
{
    protected static string $resource = LeaveRequestResource::class;

    public function getTitle(): string
    {
        return 'Urlopy';
    }

    protected function getHeaderActions(): array
    {
        if (auth()->user()?->email === 'pejot@wp.pl') {
            return [];
        }

        return [
            Actions\CreateAction::make()
                ->label('Dodaj urlop'),
        ];
    }
}
