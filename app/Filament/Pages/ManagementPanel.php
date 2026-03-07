<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;

class ManagementPanel extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-cog-6-tooth';
    protected static ?string $navigationLabel = 'Panel zarządzania';
    protected static ?string $navigationGroup = 'Zarządzanie';
    protected static ?int $navigationSort = 1;
    protected static string $view = 'filament.pages.management-panel';

    public static function canAccess(): bool
    {
        return in_array(auth()->user()?->email, [
            'justusque@gmail.com',
            'pejot@wp.pl',
        ], true);
    }
}
