<?php

namespace App\Filament\Resources\LeaveRequestResource\Pages;

use App\Filament\Resources\LeaveRequestResource;
use Filament\Resources\Pages\EditRecord;

class EditLeaveRequest extends EditRecord
{
    protected static string $resource = LeaveRequestResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }

    public function getTitle(): string
    {
        return auth()->user()?->email === 'pejot@wp.pl'
            ? 'Akceptacja urlopu'
            : 'Edytuj urlop';
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        if (auth()->user()?->email === 'pejot@wp.pl') {
            $data['approved_by'] = auth()->id();
            $data['approved_at'] = now();
        }

        return $data;
    }
}
