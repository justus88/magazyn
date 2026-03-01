<?php

namespace App\Filament\Resources\ActivityResource\Pages;

use App\Filament\Resources\ActivityResource;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;
use Spatie\Activitylog\Models\Activity;

class ViewActivity extends ViewRecord
{
    protected static string $resource = ActivityResource::class;

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist->schema([
            Infolists\Components\Section::make('Szczegóły')
                ->schema([
                    Infolists\Components\TextEntry::make('created_at')
                        ->label('Kiedy')
                        ->dateTime('Y-m-d H:i:s'),

                    Infolists\Components\TextEntry::make('causer.email')
                        ->label('Kto'),

                    Infolists\Components\TextEntry::make('event')
                        ->label('Akcja'),

                    Infolists\Components\TextEntry::make('model_pretty')
                        ->label('Model')
                        ->getStateUsing(fn (Activity $record) => $record->subject_type ? class_basename($record->subject_type) : '-'),

                    Infolists\Components\TextEntry::make('subject_id')
                        ->label('ID'),

                    Infolists\Components\TextEntry::make('description')
                        ->label('Opis')
                        ->columnSpanFull(),

                    Infolists\Components\TextEntry::make('properties_pretty')
                        ->label('Properties (JSON)')
                        ->getStateUsing(function (Activity $record) {
                            $p = $record->properties;

                            // bywa string JSON
                            if (is_string($p)) {
                                $decoded = json_decode($p, true);
                                if (json_last_error() === JSON_ERROR_NONE) {
                                    return json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                                }
                                return $p;
                            }

                            // bywa array / collection-like
                            if (is_array($p)) {
                                return json_encode($p, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                            }

                            if (is_object($p) && method_exists($p, 'toArray')) {
                                return json_encode($p->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                            }

                            return json_encode($p, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                        })
                        ->extraAttributes(['class' => 'font-mono whitespace-pre-wrap'])
                        ->columnSpanFull(),
                ])
                ->columns(2),
        ]);
    }
}
