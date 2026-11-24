# Półka ważnych dla mnie książek

Osobista kolekcja Jana Jędrzejaka obejmuje 19 polskich wydań w czterech kategoriach: produkt i strategia, technologia i AI, reportaż i biografie oraz literatura.

[Otwórz półkę](https://janjedrzejak.github.io/books/) · [Katalog](https://janjedrzejak.github.io/books/catalog.html)

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
- Numery książek zaczynają się od 1. Identyfikatory w adresach `#book/…` muszą być unikalne.
- Build sprawdza ISBN, metadane i lokalne pliki oraz odtwarza [katalog źródeł](docs/KATALOG.md). Kategorie sterujące półką są w [src/data/catalog.ts](src/data/catalog.ts).

## Mechanika i weryfikacja

[Architektura](docs/ARCHITEKTURA.md), [model ruchu](docs/MECHANIKA.md) i [pomiary referencji](docs/REFERENCJA.md) opisują konstrukcję i punkt wyjścia karuzeli 3D. [Weryfikacja porównawcza](docs/TESTY.md) dokumentuje pierwsze wydanie aplikacji.

[Portfolio](https://janjedrzejak.github.io/pl/)
