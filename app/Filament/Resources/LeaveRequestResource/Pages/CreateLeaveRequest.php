<?php

namespace App\Filament\Resources\LeaveRequestResource\Pages;

use App\Filament\Resources\LeaveRequestResource;
use Filament\Resources\Pages\CreateRecord;

class CreateLeaveRequest extends CreateRecord
{
    protected static string $resource = LeaveRequestResource::class;

    public function getTitle(): string
    {
        return 'Nowy wniosek urlopowy';
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['user_id'] = auth()->id();
        $data['status'] = 'pending';

        return $data;
    }
}
