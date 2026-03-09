<?php

namespace App\Filament\Resources\LeaveRequestResource\Pages;

use App\Filament\Resources\LeaveRequestResource;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListLeaveRequests extends ListRecords
{
    protected static string $resource = LeaveRequestResource::class;

    protected static string $view = 'filament.resources.leave-request-resource.pages.list-leave-requests';

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

    protected function getViewData(): array
    {
        $monthParam = request('month');

        $currentMonth = $monthParam
            ? Carbon::createFromFormat('Y-m', $monthParam)->startOfMonth()
            : now()->startOfMonth();

        $calendarStart = $currentMonth->copy()->startOfWeek(Carbon::MONDAY);
        $calendarEnd = $currentMonth->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY);

        $leaveRequests = LeaveRequest::query()
            ->with(['user', 'approver'])
            ->whereDate('date_from', '<=', $calendarEnd->toDateString())
            ->whereDate('date_to', '>=', $calendarStart->toDateString())
            ->get();

        $weeks = [];
        $week = [];

        foreach (CarbonPeriod::create($calendarStart, $calendarEnd) as $date) {
            $entries = [];

            foreach ($leaveRequests as $leave) {
                if ($date->between(
                    $leave->date_from->copy()->startOfDay(),
                    $leave->date_to->copy()->endOfDay()
                )) {
                    $entries[] = [
                        'name' => $leave->user?->name ?? '-',
                        'status' => $leave->status,
                    ];
                }
            }

            $week[] = [
                'date' => $date->copy(),
                'in_month' => $date->month === $currentMonth->month,
                'entries' => $entries,
            ];

            if (count($week) === 7) {
                $weeks[] = $week;
                $week = [];
            }
        }

        return array_merge(parent::getViewData(), [
            'currentMonth' => $currentMonth,
            'prevMonth' => $currentMonth->copy()->subMonth()->format('Y-m'),
            'nextMonth' => $currentMonth->copy()->addMonth()->format('Y-m'),
            'weeks' => $weeks,
        ]);
    }
}
