# Magazyn Serwisowy

Aplikacja webowa do zarządzania magazynem części serwisowych dla urządzeń kolejowych. Projekt składa się z backendu (Node.js + Express + TypeScript) oraz frontendu (React + Vite + TypeScript).

## Struktura repozytorium
- `server/` – API i logika biznesowa, Express + TypeScript.
- `client/` – aplikacja React prezentująca stan magazynu.

## Wymagania
- Node.js 18+ (zalecane 20 LTS).
- npm 10+.

## Szybki start

```bash
# Backend API
cd server
npm install
npm run dev
# serwer dostępny pod http://localhost:4000

# Frontend
cd ../client
npm install
npm run dev
# aplikacja uruchomi się na http://localhost:5173
```

Domyślnie frontend komunikuje się z API pod adresem `http://localhost:4000`. Aby zmienić adres, ustaw zmienną środowiskową `VITE_API_URL` podczas uruchamiania frontendu.

## Co dalej?
1. Zaprojektować schemat bazy danych (np. Prisma + SQLite lokalnie, docelowo PostgreSQL).
2. Dodać moduł uwierzytelniania użytkowników z rolami (serwisant/magazynier/admin).
3. Zaimplementować CRUD dla kategorii części, kartotek magazynowych i ruchów magazynowych.
4. Przygotować import/eksport list części z i do plików CSV.
5. Dodać podstawowe testy jednostkowe i e2e (Playwright/Cypress) dla kluczowych przepływów.
6. Zaplanować integrację ze skanowaniem kodów kreskowych (Progressive Web App + MediaDevices API).
