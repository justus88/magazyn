# Magazyn Serwisowy

Dwuczęściowa aplikacja (API + frontend) do zarządzania magazynem części serwisowych dla urządzeń kolejowych. Backend wykorzystuje Node.js, Express i Prisma (SQLite lokalnie, docelowo PostgreSQL), a frontend React + Vite prezentuje stan magazynu.

## Struktura repozytorium
- `server/` – API, logika biznesowa, Prisma ORM, migracje oraz seed danych.
- `client/` – interfejs React z filtrowaniem i przeglądaniem stanów części.

## Wymagania
- Node.js 18+ dla backendu (zalecane 20 LTS). Frontend (Vite) wymaga Node 20.19+ lub 22.12+.
- npm 10+.

## Konfiguracja środowiska
1. **Instalacja zależności**
   ```bash
   cd server
   npm install

   cd ../client
   npm install
   ```
2. **Zmienne środowiskowe backendu**
   ```bash
   cd server
   cp .env.example .env
   # uzupełnij wartości (PORT, CORS_ORIGIN, JWT_SECRET)
   ```
3. **Migracje i dane startowe** (SQLite lokalnie):
   ```bash
 npm run prisma:migrate   # zastosuje przygotowane migracje (tworzy bazę prisma/dev.db)
  npm run db:seed          # uzupełni przykładowe kategorie i części
  ```

   Seed tworzy również konto administratora `admin@magazyn.local` z hasłem `Admin123!`. Wartości można nadpisać zmiennymi `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` przed uruchomieniem seeda.

## Uruchomienie
- **Backend (API)**
  ```bash
  cd server
  npm run dev
  # serwer na http://localhost:4000 (m.in. /health, /api/parts, /api/auth/login)
  ```
- **Frontend (React)**
  ```bash
  cd client
  npm run dev
  # aplikacja na http://localhost:5173 (domyślnie używa API pod http://localhost:4000)
  ```
  Aby wskazać inny adres API, ustaw `VITE_API_URL`, np. `VITE_API_URL=http://localhost:4000 npm run dev`.

  Przy pierwszym uruchomieniu przejdź na `/register`, utwórz konto (rola domyślnie „Serwisant”). Konto będzie oczekiwać na zatwierdzenie przez administratora. Po akceptacji zaloguj się na `/login` – token JWT zostanie zapisany w `localStorage` i automatycznie dołączany do dalszych zapytań.

  Panel administratora jest dostępny pod `/admin/users` (widoczny w menu tylko dla roli ADMIN) i pozwala zatwierdzać/dezaktywować/usuwać konta.
  Panel kategorii znajduje się pod `/categories`, a panel części pod `/parts` – obydwa widoczne dla ról ADMIN/MANAGER.

## Co już działa?
- **Backend**
  - Prisma schema dla użytkowników, kategorii, części, stanów magazynowych i logów ruchów.
  - Autoryzacja: rejestracja i logowanie (`/api/auth/register`, `/api/auth/login`) z JWT + middleware `authenticate`/`authorize`.
  - CRUD dla kategorii (`/api/categories`) i części (`/api/parts`) z walidacją Zod oraz obsługą kolizji danych w bazie.
  - Seed przykładowych części (lista startowa od Alstomu) – `npm run db:seed`.
- **Frontend**
  - Pełny flow logowania i rejestracji (formularze + walidacja) z zapisem tokenu JWT w `localStorage`.
  - Po zalogowaniu – ochrona widoków (guard), pasek nawigacji z informacjami o użytkowniku i przyciskiem „Wyloguj”.
  - Panel administratora (`/admin/users`) do przeglądania, zatwierdzania, dezaktywowania oraz usuwania kont (tylko rola `ADMIN`).
  - Panel kategorii (`/categories`) dla ról `ADMIN` i `MANAGER` – tworzenie, edycja i usuwanie kategorii wraz z podglądem liczby przypisanych części.
  - Lista części z filtrowaniem po nazwie, numerze katalogowym i kategorii oraz wizualizacją stanów minimalnych.
  - Nowo zarejestrowani użytkownicy otrzymują rolę `TECHNICIAN`; administrator przyznaje inne role podczas zatwierdzania.

## Plan dalszych prac / testy
- **Warstwa danych**: dodać zapisy ruchów magazynowych (dostawy/zużycia/korekty) z powiązaniem do użytkowników i stanów `StockLevel`.
- **Uwierzytelnianie**: refresh tokeny, reset haseł, panel zarządzania użytkownikami (role admin/magazynier/serwisant).
- **Import/eksport**: obsługa plików CSV dla list części i raportów magazynowych.
- **Skanowanie kodów**: prototyp PWA z dostępem do kamery (`MediaDevices`) dla telefonów.
- **Testy**:
  - Backend: testy jednostkowe (Vitest/Jest) oraz integracyjne endpoints (supertest) z mockiem JWT.
  - Frontend: testy komponentów (Vitest + Testing Library) i e2e (Playwright) dla kluczowych ścieżek (logowanie, dodanie części, zużycie).
  - CI/CD: workflow instalujący zależności, lint (`npm run lint`), testy oraz weryfikacja migracji (`prisma migrate deploy`).

## Przydatne komendy backendu
```bash
npm run prisma:generate   # odświeżenie klienta Prisma po zmianie schema
npm run prisma:migrate    # tworzenie/stosowanie migracji (dev)
npm run db:seed           # zasilenie przykładowymi danymi
npm run prisma:studio     # interfejs graficzny Prisma Studio
```

## Przydatne komendy frontendu
```bash
npm run build    # build produkcyjny
npm run preview  # podgląd builda
npm run lint     # lintowanie (ESLint)
```
