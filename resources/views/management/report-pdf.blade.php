<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Raport PDF</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            color: #111;
        }
        h1 {
            font-size: 20px;
            margin-bottom: 4px;
        }
        .meta {
            margin-bottom: 18px;
            color: #444;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 6px 8px;
            vertical-align: top;
        }
        th {
            background: #f3f3f3;
            text-align: left;
        }
        .right {
            text-align: right;
        }
        .small {
            font-size: 11px;
            color: #555;
        }
    </style>
</head>
<body>
    <h1>Raport PDF</h1>

    <div class="meta">
        Zakres: <strong>{{ $dateFrom }}</strong> — <strong>{{ $dateTo }}</strong><br>
        Typ dokumentów: <strong>WZ</strong><br>
        Wygenerowano: <strong>{{ now()->format('d-m-Y H:i') }}</strong>
    </div>

    <table>
        <thead>
            <tr>
                <th>Data</th>
                <th>KTW</th>
                <th>Kod</th>
                <th>Część</th>
                <th>Ilość</th>
                <th>Kto</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($row->document_date)->format('d-m-Y') }}</td>
                    <td>{{ $row->ktw ?: '-' }}</td>
                    <td>{{ $row->code }}</td>
                    <td>{{ $row->name }}</td>
                    <td class="right">{{ rtrim(rtrim(number_format($row->qty, 2, ',', ''), '0'), ',') }} {{ $row->unit }}</td>
                    <td>{{ $row->user_name ?: '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6">Brak danych w wybranym zakresie.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <p class="small">
        Liczba pozycji: {{ count($rows) }}
    </p>
</body>
</html>
