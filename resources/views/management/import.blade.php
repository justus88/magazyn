<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Import z Excel</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f7f7f7; }
        .box { max-width: 720px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
        h1 { margin-top: 0; }
        .row { margin: 16px 0; }
        .msg { padding: 12px 14px; border-radius: 8px; margin-bottom: 16px; }
        .ok { background: #e8f7e8; color: #1f6b1f; }
        .err { background: #fdeaea; color: #8a1f1f; }
        button {
            background: #2563eb; color: #fff; border: 0; border-radius: 8px;
            padding: 10px 16px; cursor: pointer; font-size: 14px;
        }
        a { color: #2563eb; text-decoration: none; }
    </style>
</head>
<body>
    <div class="box">
        <h1>Import z Excel</h1>

        @if (session('success'))
            <div class="msg ok">{{ session('success') }}</div>
        @endif

        @if ($errors->any())
            <div class="msg err">
                {{ $errors->first() }}
            </div>
        @endif

        <form action="{{ route('management.import.post') }}" method="POST" enctype="multipart/form-data">
            @csrf

            <div class="row">
                <label for="file">Plik XLSX / CSV</label><br><br>
                <input
                    id="file"
                    type="file"
                    name="file"
                    accept=".xlsx,.csv"
                    required
                >
            </div>

            <div class="row">
                <button type="submit">Importuj</button>
            </div>
        </form>

        <div class="row">
            <a href="{{ \App\Filament\Pages\ManagementPanel::getUrl() }}">← Wróć do panelu zarządzania</a>
        </div>
    </div>
</body>
</html>
