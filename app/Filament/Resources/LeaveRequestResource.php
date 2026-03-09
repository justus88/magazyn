<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LeaveRequestResource\Pages;
use App\Models\LeaveRequest;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class LeaveRequestResource extends Resource
{
    protected static ?string $model = LeaveRequest::class;

    protected static ?string $navigationLabel = 'Urlopy';
    protected static ?string $navigationGroup = 'Magazyn';
    protected static ?string $navigationIcon = 'heroicon-o-calendar-days';

    public static function canAccess(): bool
    {
        return in_array(auth()->user()?->email, [
            'justusque@gmail.com',
            'rjochman@wp.pl',
            'filipiakradoslaw2@gmail.com',
            'pejot@wp.pl',
        ], true);
    }

    public static function form(Form $form): Form
    {
        $isPejot = auth()->user()?->email === 'pejot@wp.pl';

        return $form->schema([
            Forms\Components\Hidden::make('user_id')
                ->default(fn () => auth()->id())
                ->visible(false),

            Forms\Components\TextInput::make('employee_name')
                ->label('Pracownik')
                ->default(fn ($record) => $record?->user?->name)
                ->disabled()
                ->dehydrated(false)
                ->visible(fn () => $isPejot),

            Forms\Components\DatePicker::make('date_from')
                ->label('Od')
                ->required()
                ->disabled(fn () => $isPejot),

            Forms\Components\DatePicker::make('date_to')
                ->label('Do')
                ->required()
                ->afterOrEqual('date_from')
                ->disabled(fn () => $isPejot),

            Forms\Components\Textarea::make('note')
                ->label('Uwagi')
                ->rows(3)
                ->disabled(fn () => $isPejot),

            Forms\Components\Select::make('status')
                ->label('Status')
                ->options([
                    'pending' => 'Oczekuje',
                    'approved' => 'Zaakceptowany',
                    'rejected' => 'Odrzucony',
                ])
                ->default('pending')
                ->visible(fn () => $isPejot)
                ->required(fn () => $isPejot),

            Forms\Components\Hidden::make('approved_by')
                ->visible(false),

            Forms\Components\Hidden::make('approved_at')
                ->visible(false),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(function (Builder $query) {
                if (auth()->user()?->email === 'pejot@wp.pl') {
                    return $query->latest();
                }

                return $query->where('user_id', auth()->id())->latest();
            })
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Pracownik')
                    ->visible(fn () => auth()->user()?->email === 'pejot@wp.pl'),

                Tables\Columns\TextColumn::make('date_from')
                    ->label('Od')
                    ->date('d-m-Y')
                    ->sortable(),

                Tables\Columns\TextColumn::make('date_to')
                    ->label('Do')
                    ->date('d-m-Y')
                    ->sortable(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'approved' => 'Zaakceptowany',
                        'rejected' => 'Odrzucony',
                        default => 'Oczekuje',
                    }),

                Tables\Columns\TextColumn::make('approver.name')
                    ->label('Zatwierdził')
                    ->placeholder('-')
                    ->visible(fn () => auth()->user()?->email === 'pejot@wp.pl'),

                Tables\Columns\TextColumn::make('approved_at')
                    ->label('Data decyzji')
                    ->dateTime('d-m-Y H:i')
                    ->placeholder('-')
                    ->visible(fn () => auth()->user()?->email === 'pejot@wp.pl'),
            ])
            ->filters([])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->label(fn () => auth()->user()?->email === 'pejot@wp.pl' ? 'Rozpatrz' : 'Edytuj')
                    ->visible(function (LeaveRequest $record) {
                        if (auth()->user()?->email === 'pejot@wp.pl') {
                            return true;
                        }

                        return $record->user_id === auth()->id() && $record->status === 'pending';
                    }),

                Tables\Actions\DeleteAction::make()
                    ->label('Usuń')
                    ->visible(function (LeaveRequest $record) {
                        if (auth()->user()?->email === 'pejot@wp.pl') {
                            return false;
                        }

                        return $record->user_id === auth()->id() && $record->status === 'pending';
                    }),
            ])
            ->bulkActions([]);
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->email !== 'pejot@wp.pl';
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLeaveRequests::route('/'),
            'create' => Pages\CreateLeaveRequest::route('/create'),
            'edit' => Pages\EditLeaveRequest::route('/{record}/edit'),
        ];
    }
}
