<x-filament-panels::page>
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        <x-filament::section>
            <x-slot name="heading">
                Import / Export
            </x-slot>

            <div class="flex flex-col gap-3">
                @if (auth()->user()?->email === 'justusque@gmail.com')
                    <x-filament::button
                        tag="a"
                        :href="route('management.import')"
                        color="primary"
                    >
                        Import z Excel
                    </x-filament::button>
                @endif

                <x-filament::button
                    tag="a"
                    :href="route('products.export')"
                    color="success"
                >
                    Export stanów do Excel
                </x-filament::button>
            </div>
        </x-filament::section>

        <x-filament::section>
            <x-slot name="heading">
                Raporty
            </x-slot>

            <div class="flex flex-col gap-3">
                <x-filament::button
                    tag="a"
                    :href="route('management.report')"
                    color="gray"
                >
                    Raport PDF
                </x-filament::button>
            </div>
        </x-filament::section>

        <x-filament::section>
            <x-slot name="heading">
                Słowniki
            </x-slot>

            <div class="flex flex-col gap-3">
                <x-filament::button
                    tag="a"
                    :href="\App\Filament\Resources\SystemResource::getUrl()"
                    color="gray"
                >
                    Systemy
                </x-filament::button>
            </div>
        </x-filament::section>

        <x-filament::section>
            <x-slot name="heading">
                Narzędzia
            </x-slot>

            <div class="text-sm text-gray-500">
                Tu później dodamy backup, naprawę stanów, czyszczenie cache i inne narzędzia.
            </div>
        </x-filament::section>

    </div>
</x-filament-panels::page>
