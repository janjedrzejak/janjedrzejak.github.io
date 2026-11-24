# Engineering shelf — pomiary referencji

23 listopada 2026 r. Otwarto [oryginalną półkę](https://layoffsandhires.com/engineering) w przeglądarce z JavaScriptem. Obserwacje i geometria poniżej pochodzą z publicznego HTML, CSS, kodu klienckiego oraz z rzeczywistych interakcji. Raport dotyczy oryginału. Komplet wyników aplikacji odtworzonej i jej różnic powinien być czytany osobno.

## Półka i okładka w spoczynku

Karuzela zawiera czternaście pozycji i zawija na obu końcach. Jej DOM zawiera 42 wystąpienia, po trzy na pozycję. Renderuje centralną okładkę między pionowymi grzbietami poprzedzających i następnych książek. Każdy transformowany obiekt oryginału składa się z dwóch widocznych powierzchni CSS w układzie `preserve-3d`. Grzbiet jest skierowany ku odbiorcy przy zerowym obrocie. Front przylega do prawej strony tej bryły. Przy centralnej pozycji obiekt obraca się wokół swojej pionowej osi Y i przechyla lekko w lewo wokół osi Z. W źródle nie znaleziono osobnych tylnych okładek ani bloku kartek. Książka pozostaje zamknięta.

| Viewport przy DPR 1 | Środek półki x, y [px] | Wysokość modelu H [px] | Centralny front w spoczynku x, y, szer., wys. [px] |
|---|---:|---:|---|
| 390 × 844 | 195,00 / 476,64 | 280,80 | 64,76 / 314,96 / 260,48 / 308,82 |
| 393 × 852 | 196,50 / 480,64 | 282,95 | 65,22 / 317,68 / 262,55 / 311,28 |
| 430 × 932 | 215,00 / 520,64 | 309,59 | 70,86 / 341,71 / 288,28 / 341,77 |
| 768 × 1024 | 384,00 / 573,64 | 238,08 | 274,18 / 437,32 / 219,65 / 260,40 |
| 1440 × 900 | 720,00 / 515,08 | 446,39 | 508,41 / 252,42 / 423,18 / 501,70 |

H to większa z wartości 120 px i mniejszej z wysokości dostępnego obszaru pomniejszonej o 80 px oraz 31% szerokości widoku. Poniżej 768 px źródło stosuje 72% szerokości. Szerokość grzbietu wynosi 0,15H, odstęp nominalny 0,03H, a szerokość okładki wynika z proporcji wydania. Końcowy prostokąt w tabeli obejmuje obrót i perspektywę. Wspólnym punktem odniesienia jest górny lewy narożnik viewportu.

### Pozycje wszystkich książek na starcie przy 1440 × 900

W tabeli jest najbliższe centrum wystąpienie każdej pozycji. X modelu mierzy translację w układzie sceny. X powierzchni to lewa krawędź okładki dla pozycji 01 i grzbietu dla pozostałych pozycji, już po rzucie perspektywicznym. Przy remisie obie kopie pozycji 08 wypadają poza viewportem.

| Nr | Grzbiet | X modelu [px] | X powierzchni [px] | Szerokość powierzchni [px] | Początkowa widoczność |
|---:|---|---:|---:|---:|---|
| 01 | Computer Systems | 0,0 | 508,4 | 423,2 | pełna |
| 02 | Operating Systems | 240,4 | 942,0 | 71,8 | pełna |
| 03 | Computer Networking | 320,8 | 1032,4 | 72,8 | pełna |
| 04 | Designing Data-Intensive Applications | 401,1 | 1118,4 | 72,6 | pełna |
| 05 | System Design Interview | 481,5 | 1200,5 | 71,8 | pełna |
| 06 | Building Microservices | 561,8 | 1292,6 | 72,6 | pełna |
| 07 | Docker Deep Dive | 642,2 | 1380,2 | 72,6 | częściowa |
| 08 | Kubernetes: Up & Running | -722,5 | -99,3 | 72,6 | poza viewportem |
| 09 | Terraform: Up & Running | -642,2 | -12,2 | 72,6 | częściowa |
| 10 | Site Reliability Engineering | -561,8 | 74,8 | 72,6 | pełna |
| 11 | Deep Learning | -481,5 | 162,1 | 72,5 | pełna |
| 12 | Designing Machine Learning Systems | -401,1 | 249,0 | 72,6 | pełna |
| 13 | Build a Large Language Model | -320,8 | 334,6 | 72,8 | pełna |
| 14 | AI Engineering | -240,4 | 423,2 | 72,6 | pełna |

## Przejścia zaobserwowane w oryginale

| Stan początkowy | Zdarzenie | Pozycja i orientacja | Czas i wygładzenie | Widoczność i stan końcowy |
|---|---|---|---|---|
| Ustabilizowana półka | Pierwsze wejście | Pierwsza książka w środku, Y = −0,025H, Z = 0,20H, Rz = −4,5°, Ry = −90°. Spoczynkowe sąsiednie grzbiety mają zerowy Rz i Ry. | Pojawienie sceny 400 ms. | Wybrana grupa Foundations, numer 01 w centrum. Dalej można wybrać dowolną pozycję. |
| Boczny grzbiet | Najechanie / wyjście myszy | Model podnosi się w osi Y do −0,045H od pozycji początkowej. Sąsiedzi zachowują swoje miejsca. | Wygładzenie wykładnicze ze stałą 12/s, około 250 ms do 95% celu. | Boczny grzbiet dalej widoczny. Po opuszczeniu schodzi do pierwotnej wysokości. |
| Wybrana okładka | Ruch kursora nad jej powierzchnią | Zmienia się Ry do około ±9° wokół bazowego −90° i Rx w zależności od wysokości kursora, około ±6°. Środek książki pozostaje kotwicą. | Wygładzenie wykładnicze 7/s. | Kursor ma napis Open. Opuszczenie sceny sprowadza przechył do zera. |
| Ustabilizowana półka | Kliknięcie bocznego grzbietu, strzałka, klawisz strzałki | Cały rząd zmienia X. Poprzednia okładka przechodzi z −90° do 0° w osi Y i cofa się w Z, a nowa jednocześnie przechodzi z 0° do −90° i wysuwa się. | Wygładzenie położenia indeksu 5,2/s. Dla pojedynczego kroku 50% odległości przypada na ok. 133 ms, 95% na ok. 576 ms. | Nie ma panelu szczegółów. Nowa książka zajmuje środek, pozostałe wypełniają zwolnione miejsce. |
| Półka | Przeciągnięcie, przesunięcie palcem, kółko | Horyzontalne przesunięcie zamieniane na ułamki indeksu, następnie zaokrąglane do książki. | Aktywny drag 18/s, po puszczeniu 5,2/s. Próg rozpoczęcia dragu powyżej 5 px. Kółko wyrównuje cel po 160 ms ciszy. | Ruch palca nie otwiera szczegółów. Kontener ma `touch-action: pan-y`; pionowe przesunięcie nie otworzyło książki w żadnym z czterech testów dotykowych. |
| Wybrana centralna książka | Kliknięcie lub dotknięcie okładki, aktywacja Open book | Panel wyrasta z rzeczywistego ekranowego prostokąta frontu. Clip-path rozszerza się do całego viewportu, Rz = −4,5° → 0°. Układ półki trwa pod animacją. | 1050 ms, cubic-bezier(.76,0,.18,1). Teksty od 620 ms, kolejne nagłówki co 75 ms, wiersze co 30 ms. Każdy przesuwa się ze 110% wysokości do zera przez 900 ms z cubic-bezier(.2,.8,.2,1). | Zmienia się ścieżka na /engineering/ID. Na desktopie treść jest po lewej, powiększona okładka po prawej. Na mobile okładka jest nad treścią, a panel jest przewijalny. |
| Otwierający się panel | Pojawianie się finalnej ilustracji | Oryginalny oddzielny obraz w SVG odkrywa maska siedmiu rozszerzających się kręgów z filtrem zaburzeń; nie otwiera się skrzydełko okładki. | Początek po 520 ms, osobne opóźnienia 0–420 ms, wzrost promienia do 720 przez 1250 ms z ease-out cubic. | Przy 525 ms wciąż dominuje biel. Po ok. 2,4 s okładka i treść są kompletne. |
| Szczegóły, także w czasie otwierania | Close, Escape lub systemowe Wstecz | Panel zmniejsza clip-path do bieżących granic frontu i wraca do Rz = −4,5°. | 800 ms, cubic-bezier(.22,1,.36,1), z keyframe opacity 1 przy 60% i 0 na końcu. | Panel przestaje przyjmować wejście. Na półce widoczna jest ta sama centralna pozycja. |
| Dowolna pozycja półki | Wybór grupy | Przejazd najbliższą drogą do pierwszej pozycji grupy. Sąsiedzi z innych grup zostają w karuzeli. | Ta sama dynamika co centrowanie, wskaźnik grupy 600 ms, cubic-bezier(.2,.8,.2,1). | Foundations → 01, Backend → 04, Infra & Ops → 07, AI → 11, All → 01. Po All wyróżnione jest Foundations. |

Wszystkie wymiary osi podano w układzie CSS, gdzie dodatnie Z kieruje do odbiorcy. Wygładzenie opisują stałe w równaniu wykładniczym, dlatego ruch całej półki nie ma jednego sztywnego czasu trwania. Znormalizowana bliskość do środka ma wartość 1 przy zerowym przesunięciu i maleje do zera na sąsiednim indeksie. Między tymi granicami interpoluje ją funkcja smoothstep. Od niej zależą Z, Rz, centralne Ry i cieniowanie. Perspektywa pozostaje stała i wynosi 2200 px. Cień frontu w źródle to przesunięcie 30 px w dół, rozmycie 60 px i spread −28 px. Grzbiet wykorzystuje poziomy gradient i wewnętrzny cień. Ciemna nakładka frontu maleje z 50% na boku do zera na środku.

## Powtarzalność i dowody

- `measure.py` odtwarza otwieranie i zamykanie 14 książek przy użyciu zdarzeń wejściowych w Chromium. Kolejne powroty do półki aktywują przycisk Close albo klawisz Escape. Dodatkowo sprawdza kategorię, oba typy hoveru, klikanie grzbietów, szybkie polecenia, przejście z pozycji 14 do 01, przeciąganie, kółko, przerwanie otwarcia oraz historię Wstecz/Dalej.
- `reference-desktop-tests.json` zapisuje wyniki interakcji, nazwy pozycji i ich ścieżki. Zakres obejmuje powierzchnię półki oraz panel książki. Linki serwisu dotyczące ofert pracy i kont użytkowników są poza zakresem reprodukcji.
- `keyframes.json` wiąże każdy PNG z geometrią widocznych powierzchni i czasem. W klatkach porównawczych rAF ma kontrolowany zegar; natywne Web Animations są zatrzymywane na oznaczonej milisekundzie. Dla ENTRANCE uwzględniane są animacje potomków. Przy powrocie ustawiany jest jedynie czas panelu.
- Dodatkową weryfikację zapewniają dwa nieprzerwane nagrania rzeczywistych wejść, bez zatrzymywania zegara. `desktop-native-interaction.mp4` rejestruje przejście do następnej książki i z powrotem, hover, otwarcie i zamknięcie. `mobile-native-interaction.mp4` rejestruje swipe, dotknięcie i powrót. Metadane o klatkach i momentach wejść są w JSON obok nagrań.
- Desktopowe PNG i filmy pochodzą z Google Chrome for Testing 144.0.7559.31 w rozdzielczości CSS, DPR 1. Zrzuty mobilne pochodzą z tego samego silnika z emulacją dotyku. Dodatkowy test otwarcia i zamknięcia wykonano w porcie Playwright WebKit 26.5 z emulacją 390 × 844. Nie wykonano pomiarów na fizycznym iPhonie.
- Wejścia w testach są natywne dla przeglądarki. W środowisku wykonawczym transport testowy kieruje GET do oryginalnego serwera przez klienta z zaufanym łańcuchem certyfikatów. Zachowuje oryginalne bajty treści po rozpakowaniu HTTP. Wyłącza wysyłanie telemetrycznych POST. Na komputerze z normalnym dostępem do serwisu można ustawić `REFERENCE_NATIVE_NETWORK=1`.
- Źródłami są wyrenderowany widok, publiczny HTML oraz załadowane przez stronę pliki `2zgr3qd4ui_qe.js` i `04vs2bpyok9tl.css`. Kod i oryginalne obrazy źródłowe nie stanowią części implementacji. Zrzuty i nagrania są materiałem porównawczym.
