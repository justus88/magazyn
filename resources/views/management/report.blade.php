<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Raport PDF</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f7f7f7; }
        .box { max-width: 720px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
        h1 { margin-top: 0; }
        .row { margin: 16px 0; }
        label { display: block; margin-bottom: 8px; font-weight: bold; }
        input[type="date"] { padding: 10px; width: 100%; max-width: 260px; }
        button {
            background: #2563eb; color: #fff; border: 0; border-radius: 8px;
            padding: 10px 16px; cursor: pointer; font-size: 14px;
        }
        a { color: #2563eb; text-decoration: none; }
        .msg { padding: 12px 14px; border-radius: 8px; margin-bottom: 16px; background: #fdeaea; color: #8a1f1f; }
    </style>
</head>
<body>
    <div class="box">
        <h1>Raport PDF</h1>

        @if ($errors->any())
            <div class="msg">{{ $errors->first() }}</div>
        @endif

        <form action="{{ route('management.report.generate') }}" method="POST">
            @csrf

            <div class="row">
                <label for="date_from">Od daty</label>
                <input
                    id="date_from"
                    type="date"
                    name="date_from"
                    value="{{ old('date_from') }}"
                    required
                >
            </div>

            <div class="row">
                <label for="date_to">Do daty</label>
                <input
                    id="date_to"
                    type="date"
                    name="date_to"
                    value="{{ old('date_to') }}"
                    required
                >
            </div>

            <div class="row">
                <button type="submit">Generuj PDF</button>
            </div>
        </form>

        <div class="row">
            <a href="{{ \App\Filament\Pages\ManagementPanel::getUrl() }}">← Wróć do panelu zarządzania</a>
        </div>
    </div>
</body>
</html>
