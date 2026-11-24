# Weryfikacja pierwotnej półki inżynierskiej

Pomiary odnoszą się do wydania z commitu 443dd7f, sprzed dodania kolekcji osobistej i dopasowania oprawy do portfolio.

## Środowiska i wynik

Testy objęły Chromium 144 i Playwright WebKit 26.5, rozmiary 390 × 844, 393 × 852, 430 × 932, 768 × 1024 i 1440 × 900. Poza przebiegiem DPR 1 wykonano test profilu iPhone 15 Pro z DPR 3. WebKit uruchomiono pod Linuksem. Brakuje pomiaru na fizycznym iPhonie z Safari.

| Zakres | Zaobserwowany rezultat |
|---|---|
| Początek, geometria i powrót | W pięciu rozmiarach centralny front mieści się w widoku. W pomiarze końcowych granic frontu maksymalna różnica względem referencji, po zaokrągleniu do 0,01 piksela CSS, wyniosła 0,01 px. |
| Przebieg wyboru | Przy 133 ms różnica granicy dochodziła do 1,70 px przy wyborze w prawo i 15,46 px przy powrocie w lewo. Na wynik klatki pośredniej wpływa położenie wejścia w cyklu requestAnimationFrame. |
| 14 cykli i okładki | Każdy z 14 tytułów z własną, zdekodowaną okładką przeszedł wybór, otwarcie i zamknięcie w obu silnikach. Porównano powrót do wybranej książki i niezmienną liczbę 42 instancji w DOM. |
| Hover i wejście | W obu kierunkach działa powrót z hoveru. Strzałki, grzbiety, klawiatura, kółko oraz przeciąganie przesuwają indeks. |
| Dotyk | Tap z boku centruje, tap okładki otwiera, przesunięcie poziome przewija. Gest pionowy nie aktywuje książki. Panel na telefonie przewija opis. |
| Szybka zmiana kierunku i kategorii | Cel zmienia się na ostatnie polecenie. Wstecz i Dalej odtwarzają stan. Escape działa również podczas odsłaniania. Rozmiar sceny przelicza się po obrocie. |
| Katalog | All pokazuje 14 rekordów, Backend trzy. Link przenosi do odpowiedniego tytułu. Wstecz wraca do katalogu. |
| Brak zasobu | Przy celowym odcięciu obrazów status pozostaje czytelny, a bibliografia i link do źródła są dostępne. |
| Rendering WebKit | Próby z nagraniem kompozytora przy wszystkich pięciu rozmiarach wykazały poprawny obraz na bryle, po zakończeniu dekodowania obrazu i fontu. Na zimnym starcie tego portu odnotowano krótkie opóźnienie między dekodowaniem a odmalowaniem warstwy. |
| Rendering w spoczynku | W sprawdzonym przedziale Chromium nie wykonywał klatek kontrolera półki. Liczba elementów DOM przed i po powtórzeniach ustabilizowała się. |

Klatki 133 / 525 / 400 ms stanowią porównanie kształtu i położenia. Oryginał i nasza aplikacja były uruchamiane w rzeczywistej przeglądarce na zgodnych rozdzielczościach. Zrzuty stabilnych stanów stanowią osobny punkt pomiaru obok nagrania z naturalnym zegarem. Szczegóły narzędzi i poleceń są w [qa/README.md](../qa/README.md). Zestaw obrazów porównawczych i wyniki JSON są w paczce wydania w folderze evidence/.

## Różnice względem referencji

- **Oprawa.** Jan’s reading room ma własne tło półki, typografię, grzbiety i nawigację. Na desktopie okładka w szczegółach znajduje się po lewej. Na telefonie nadal poprzedza opis.
- **Bryły.** Geometria zawiera także tylną oprawę i trzy krawędzie bloku stron. Zaczyna się od gotowej półki, bez osobnego wejścia całej kolekcji przez zanikanie. Przez to po prawej stronie widać więcej głębi sąsiednich brył.
- **Wydania.** *Docker Deep Dive* używa zweryfikowanego wariantu. *System Design Interview* pokazuje drukowaną okładkę tomu 1 z napisem „Second Edition”. *Computer Systems* korzysta z czystej grafiki Pearson tego samego wydania. Pozostałe dane i porównania dla każdego obrazu są w [KATALOG.md](KATALOG.md).
- **Interfejs.** Open book jest także widocznym przyciskiem. Katalog ma osobne filtry i pozwala zobaczyć wszystkie 14 pozycji. Półka pokazuje ruchomy fragment kolekcji i udostępnia wszystkie 14 przez przesunięcie, tak jak referencja. Serwis ofert pracy ma własne funkcje poza zakresem biblioteki.
- **Detale animacji.** Maskę odkrywania farby liczy worker. Losowe krawędzie referencyjnego SVG i naszej maski różnią się. Obie mają siedem płynnie rosnących pól i przebieg odsłaniania rozpoczynający się po 520 ms.
