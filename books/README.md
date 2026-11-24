# Półka ważnych dla mnie książek

Osobista kolekcja Jana Jędrzejaka w czterech kategoriach: produkt i strategia, technologia i AI, reportaż i biografie oraz literatura. Domyślna półka prezentuje 18 polskich wydań. Oryginalna półka inżynierska z 14 książkami jest dostępna obok kolekcji osobistej. Rozdzielenie kolekcji zachowuje linki do wcześniejszych tytułów.

[Otwórz półkę](https://janjedrzejak.github.io/books/) · [Katalog](https://janjedrzejak.github.io/books/catalog.html) · [Półka inżynierska](https://janjedrzejak.github.io/books/?shelf=engineering)

## Sterowanie

Kliknięcie grzbietu ustawia książkę na środku. Kliknięcie okładki odsłania opis. Strzałki, gest poziomy i kółko przewijają rząd. Zamknij, Escape lub Wstecz zwijają opis do tej samej okładki. Kategorie na półce prowadzą do pierwszej książki w grupie. W katalogu zawężają listę.

## Praca lokalna

Potrzebny jest Node.js 22.12 lub nowszy. Polecenia uruchom w katalogu `books/`.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Build trafia do `books/dist/`. [Build portfolio](../README_DEPLOY.md) przenosi go do `_site/books/` i dodaje wspólny nagłówek, menu oraz stopkę z polskiej strony głównej. Pełną stronę można sprawdzić w podglądzie z katalogu głównego repozytorium. Tekstury polskich wydań pochodzą z serwisów wydawców oraz dystrybutorów.

## Dodawanie książek

- Dodaj rekord w [src/data/personal-books.json](src/data/personal-books.json). Uzupełnij trwały identyfikator, tytuł, autorów, wydanie, ISBN, źródło, kategorię, notę i prawdziwą okładkę. Ustal proporcję okładki na podstawie obrazu i kolory grzbietu.
- Wcześniejszą kolekcję utrzymuje [src/data/books.json](src/data/books.json). Numery w każdej kolekcji zaczynają się od 1. Identyfikatory są wspólne dla obu kolekcji w adresach `#book/…` i muszą być unikalne.
- Build sprawdza ISBN, metadane i lokalne pliki oraz odtwarza [katalog źródeł](docs/KATALOG.md). Kategorie sterujące półką są w [src/data/catalog.ts](src/data/catalog.ts).

## Mechanika i weryfikacja

[Architektura](docs/ARCHITEKTURA.md), [model ruchu](docs/MECHANIKA.md) i [pomiary referencji](docs/REFERENCJA.md) opisują konstrukcję i punkt wyjścia karuzeli 3D. [Weryfikacja porównawcza](docs/TESTY.md) dokumentuje początkowe wydanie półki inżynierskiej. Konfiguracja obu kolekcji jest niezależna od maszyny stanów.

[Portfolio](https://janjedrzejak.github.io/pl/) · [Mapa lektur, na której opiera się kolekcja inżynierska](https://github.com/nagavineerpasam/systems-to-ai-reading-map)
