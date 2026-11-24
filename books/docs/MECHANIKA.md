# Mechanika półki

## Obserwacja przed implementacją

23 listopada 2026 otwarto [oryginał](https://layoffsandhires.com/engineering) w przeglądarce z JavaScriptem. W Chrome kliknięto środkową okładkę, zamknięto szczegóły i wybrano Backend. Automatyczna sesja z tym samym publicznym kodem pobranym z serwera objęła także dotykowe 390 × 844 i desktopowe 1440 × 900. Referencyjne zrzuty początkowe powstały przed implementacją. Poniższe ustalenia pochodzą z DOM, transformacji w klatkach i udostępnionego klientowi kodu Next.js. Tabela opisuje wersję strony zbadaną w tym dniu.

Na środku od razu stoi **Computer Systems** z widoczną okładką. Po lewej widać koniec kolekcji, po prawej drugi tytuł. Rząd zapętla się w obu kierunkach. W spoczynku nie wszystkie 14 tytułów mieszczą się w kadrze. Wybór kategorii ustawia pierwszą książkę grupy na środku. All wraca do początku. Wskaźnik zawsze pokazuje grupę centralnej książki.

Układ odniesienia ma początek w środku sceny, Y rośnie w dół, Z ku widzowi. Wysokość książki H zależy od przestrzeni dostępnej pomiędzy zakładkami i strzałkami. Przy szerokości od 768 px ograniczeniem jest 31% szerokości okna, poniżej 768 px – 72%. Dalsze ograniczenia to dostępna wysokość pomniejszona o 80 px i minimum 120 px. W spoczynku przy 1440 × 900 środek sceny wypada w (720, 515.08), H = 446.39 px. Przy 390 × 844 są to (195, 476.64) i 280.80 px.

| Stan początkowy | Zdarzenie | Położenie i orientacja | Czas / easing | Widoczność → stan końcowy |
|---|---|---|---|---|
| Grzbiet w rzędzie | Wskaźnik na grzbiecie | Y do −0,045 H. Własna orientacja grzbietu bez zmiany. | Tłumienie wykładnicze 12/s, ok. 250 ms do 95% | Grzbiet i bok widoczne → podgląd |
| Podgląd | Wskaźnik wychodzi | Y wraca do wysokości rzędu | 12/s | Ta sama bryła → spoczynek |
| Centralna książka | Ruch myszy nad okładką | Obrót Y do ±9°, X w przybliżeniu ±6°. Kursor powiększa się i pokazuje Open. | Tłumienie 7/s | Widoczna prawdziwa okładka → podgląd |
| Grzbiet lub okładka | Klik bocznego grzbietu, strzałka, kółko lub przeciąganie | Cały rząd jedzie w X. Wybrana bryła przechodzi od Ry=0 do −90°, Rz od 0 do −4,5°, Y do −0,025 H i Z do +0,2 H. Wcześniejsza centralna książka składa ten sam ruch do tyłu. | Cel indeksu ma tłumienie 5,2/s (ok. 576 ms do 95%), podczas drag 18/s. Po kółku dociągnięcie do indeksu po 160 ms. | Sąsiedzi ustępują. Nowa okładka → fokus |
| Dowolna pozycja | Wybór grupy / All | Najkrótszy przejazd w zapętlonym rzędzie do pierwszego tytułu grupy / 01 | Taki jak wybór grzbietu. Wskaźnik zakładki 600 ms | Wszystkie grupy w kolekcji → fokus |
| Fokus | Ponowny klik/tap na środku, Open book lub Enter | Biały widok szczegółów rozszerza maskę od rzutowanego prostokąta okładki, obrót −4,5° → 0°. | 1050 ms, cubic-bezier(.76,0,.18,1) | Półka pod maską → pełnoekranowy widok |
| Otwieranie | Odsłanianie treści | Okładka w szczegółach pojawia się spod maski siedmiu powiększających się pól, tekst wjeżdża od dołu wierszami | Tusz od 520 ms. Każdy promień rośnie przez 1250 ms z ease-out cubic. Tekst od 620 ms, 900 ms na wiersz, cubic-bezier(.2,.8,.2,1) | Okładka po prawej na desktopie, nad opisem na telefonie → szczegóły |
| Szczegóły | Close, Escape lub Wstecz | Maska zwija się do prostokąta tej samej okładki. Obrót do −4,5°. Krycie w końcowej fazie spada do zera. | 800 ms, cubic-bezier(.22,1,.36,1), pełne krycie do 60% interpolacji | Odsłonięta ta sama książka na środku → fokus |
| Spoczynek na dotyku | Tap / poziome przesunięcie | Tap grzbietu centruje, tap centralnej okładki otwiera. Poziomy gest przelicza odległość na liczbę grzbietów; puszczenie dociąga indeks. | Jak przy wyborze i przeciąganiu | Scroll pionowy dostępny w szczegółach |

## Perspektywa, światło i geometria

Referencja renderuje DOM w CSS 3D, ze wspólną odległością perspektywy 2200 px w transformacji każdej książki. Model odniesienia ma dwie jawne płaszczyzny, grzbiet i przód. Własna implementacja buduje również tylną okładkę i trzy krawędzie bloku stron. Obrót bryły odbywa się wokół środka objętości. Brak obserwacji ruchu okładki na zawiasie.

Grzbiet ma 0,15 H szerokości, odstęp nominalny 0,03 H. Dla odległości od środka mniejszej niż jeden indeks przejście od grzbietu do frontu korzysta z funkcji smoothstep. Dodatkowe miejsce na odsłaniany front narasta płynnie wraz z przesunięciem poziomym. Perspektywa wydobywa bok także na nieruchomych grzbietach ustawionych daleko od środka. Obrót frontem do widza rozjaśnia teksturę. Grzbiet ciemnieje do 55%, a nieaktywny front do 50%. Przednia powierzchnia rzuca rozmyty cień w dół. Punkty i wysokości powyżej podano w pikselach CSS. Czasy tłumienia są niezależne od częstotliwości klatek.
