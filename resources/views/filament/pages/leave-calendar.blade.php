<x-filament-panels::page>
    <div class="space-y-6">
        <div class="flex items-center justify-between gap-4">
            <a
                href="{{ \App\Filament\Pages\LeaveCalendar::getUrl(['month' => $prevMonth]) }}"
                class="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"
            >
                ← Poprzedni miesiąc
            </a>

            <div class="text-xl font-semibold">
                {{ $currentMonth->translatedFormat('F Y') }}
            </div>

            <a
                href="{{ \App\Filament\Pages\LeaveCalendar::getUrl(['month' => $nextMonth]) }}"
                class="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"
            >
                Następny miesiąc →
            </a>
        </div>

        <div class="flex flex-wrap gap-4 text-sm">
            <div class="flex items-center gap-2">
                <span class="inline-block h-4 w-4 rounded bg-gray-300"></span>
                <span>Oczekuje</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="inline-block h-4 w-4 rounded bg-green-400"></span>
                <span>Zaakceptowany</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="inline-block h-4 w-4 rounded bg-red-400"></span>
                <span>Odrzucony</span>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        @foreach (['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'] as $dayName)
                            <th class="border bg-gray-100 px-3 py-2 text-left font-semibold">
                                {{ $dayName }}
                            </th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @foreach ($weeks as $week)
                        <tr>
                            @foreach ($week as $day)
                                <td class="h-36 min-w-[160px] align-top border px-2 py-2 {{ $day['in_month'] ? 'bg-white' : 'bg-gray-50 text-gray-400' }}">
                                    <div class="mb-2 text-sm font-semibold">
                                        {{ $day['date']->format('d.m') }}
                                    </div>

                                    <div class="space-y-1">
                                        @foreach ($day['entries'] as $entry)
                                            @php
                                                $bg = match ($entry['status']) {
                                                    'approved' => 'bg-green-400 text-green-950',
                                                    'rejected' => 'bg-red-400 text-red-950',
                                                    default => 'bg-gray-300 text-gray-900',
                                                };
                                            @endphp

                                            <div class="rounded px-2 py-1 text-xs font-medium {{ $bg }}">
                                                {{ $entry['name'] }}
                                            </div>
                                        @endforeach
                                    </div>
                                </td>
                            @endforeach
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</x-filament-panels::page>
