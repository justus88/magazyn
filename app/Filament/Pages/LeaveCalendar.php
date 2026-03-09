<?php

namespace App\Filament\Pages;

use App\Models\LeaveRequest;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Filament\Pages\Page;

class LeaveCalendar extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-calendar';
    protected static ?string $navigationLabel = 'Kalendarz urlopów';
    protected static ?string $navigationGroup = 'Zarządzanie';
    protected static ?int $navigationSort = 21;
    protected static string $view = 'filament.pages.leave-calendar';

    public static function canAccess(): bool
    {
        return in_array(auth()->user()?->email, [
            'justusque@gmail.com',
            'rjochman@wp.pl',
            'filipiakradoslaw2@gmail.com',
            'pejot@wp.pl',
        ], true);
    }

    public function getViewData(): array
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

        $days = [];
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
                $days[] = $week;
                $week = [];
            }
        }

        return [
            'currentMonth' => $currentMonth,
            'prevMonth' => $currentMonth->copy()->subMonth()->format('Y-m'),
            'nextMonth' => $currentMonth->copy()->addMonth()->format('Y-m'),
            'weeks' => $days,
        ];
    }
}
