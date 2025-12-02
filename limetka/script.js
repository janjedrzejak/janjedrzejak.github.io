// --- ZMIENNE STANU APLIKACJI ---
let totalSecondsInitial = 0; // Początkowy ustawiony czas
let secondsRemaining = 0;    // Ile sekund zostało
let intervalId = null;       // ID interwału (pętli odliczania)
let isPaused = false;        // Czy jest pauza?
let isRunning = false;       // Czy licznik działa?
const defaultTitle = "Limetka - Timer"; // Domyślny tytuł karty

// --- POBIERANIE ELEMENTÓW Z DOM ---
const mainContainer = document.getElementById('main-app-container');
const inputMinutes = document.getElementById('input-minutes');
const inputSeconds = document.getElementById('input-seconds');
const timerDisplay = document.getElementById('timer-display');

const btnStart = document.getElementById('btn-start');
const btnPauseResume = document.getElementById('btn-pause-resume');
const btnReset = document.getElementById('btn-reset');
const btnAddMinute = document.getElementById('btn-add-minute');
const btnStop = document.getElementById('btn-stop');

// Elementy SVG
const circle = document.querySelector('.progress-ring__circle');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

// --- INICJALIZACJA SVG ---
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = 0; // Pasek pełny na starcie

// --- FUNKCJE POMOCNICZE ---

// Funkcja formatująca czas (np. zamienia 65 sekund na "01:05")
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Funkcja aktualizująca wyświetlacz, pasek postępu ORAZ TYTUŁ KARTY
function updateInterface() {
    const timeString = formatTime(secondsRemaining);

    // 1. Aktualizuj cyfry na ekranie
    timerDisplay.textContent = timeString;

    // 2. NOWOŚĆ: Aktualizuj tytuł karty w przeglądarce
    // Jeśli licznik działa lub jest zapauzowany, pokaż czas w tytule
    if (isRunning || secondsRemaining !== totalSecondsInitial) {
        let prefix = "";
        if (isPaused) prefix = "❚❚ "; // Dodaj symbol pauzy jeśli zatrzymano
        document.title = `${prefix}${timeString} - Limetka`;
    } else {
        document.title = defaultTitle;
    }

    // 3. Aktualizuj pasek SVG
    let percent = 0;
    if (totalSecondsInitial > 0) {
        percent = (secondsRemaining / totalSecondsInitial) * 100;
    }
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Funkcja kończąca odliczanie
function timeIsUp() {
    clearInterval(intervalId);
    isRunning = false;
    secondsRemaining = 0;
    updateInterface();
    
    // Zmiany wizualne
    document.body.classList.add('time-up');
    btnPauseResume.innerHTML = '▶';
    
    // NOWOŚĆ: Zmiana tytułu na koniec
    document.title = "🔔 KONIEC CZASU! - Limetka";
}


// --- GŁÓWNA LOGIKA TIMERA ---

function tick() {
    if (!isPaused && secondsRemaining > 0) {
        secondsRemaining--;
        updateInterface();

        if (secondsRemaining === 0) {
            timeIsUp();
        }
    }
}

function startTimer() {
    const mins = parseInt(inputMinutes.value) || 0;
    const secs = parseInt(inputSeconds.value) || 0;
    
    totalSecondsInitial = (mins * 60) + secs;

    if (totalSecondsInitial <= 0) return;

    secondsRemaining = totalSecondsInitial;
    isPaused = false;
    isRunning = true;

    mainContainer.classList.add('mode-running');
    document.body.classList.remove('time-up');
    btnPauseResume.innerHTML = '❚❚';

    updateInterface();

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 1000);
}

function pauseResumeTimer() {
    if (!isRunning && secondsRemaining === 0) return;

    if (isPaused) {
        isPaused = false;
        btnPauseResume.innerHTML = '❚❚';
        // Natychmiastowa aktualizacja tytułu (usuwa symbol pauzy)
        updateInterface(); 
    } else {
        isPaused = true;
        btnPauseResume.innerHTML = '▶';
        // Natychmiastowa aktualizacja tytułu (dodaje symbol pauzy)
        updateInterface();
    }
}

function resetTimer() {
    if (!isPaused) pauseResumeTimer();
    secondsRemaining = totalSecondsInitial;
    document.body.classList.remove('time-up');
    updateInterface();
}

function addMinute() {
    secondsRemaining += 60;
    totalSecondsInitial += 60;
    document.body.classList.remove('time-up');
    // Jeśli czas się skończył (tytuł był "KONIEC"), musimy go odświeżyć
    updateInterface(); 
    
    if (secondsRemaining > 0 && !isRunning) {
        isRunning = true;
        isPaused = false;
        btnPauseResume.innerHTML = '❚❚';
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(tick, 1000);
    }
}

function stopTimer() {
    clearInterval(intervalId);
    isRunning = false;
    isPaused = false;
    mainContainer.classList.remove('mode-running');
    document.body.classList.remove('time-up');
    
    // NOWOŚĆ: Przywróć domyślny tytuł po wyjściu do menu
    document.title = defaultTitle;
}

// --- EVENT LISTENERY ---
btnStart.addEventListener('click', startTimer);
btnPauseResume.addEventListener('click', pauseResumeTimer);
btnReset.addEventListener('click', resetTimer);
btnAddMinute.addEventListener('click', addMinute);
btnStop.addEventListener('click', stopTimer);

inputSeconds.addEventListener('keypress', function(e) { if(e.key === 'Enter') startTimer(); });
inputMinutes.addEventListener('keypress', function(e) { if(e.key === 'Enter') startTimer(); });


// --- FULLSCREEN ---
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

// --- UX INPUTÓW ---
[inputMinutes, inputSeconds].forEach(input => {
    input.addEventListener('blur', () => {
        let val = parseInt(input.value);
        if (input.id === 'input-seconds' && val > 59) val = 59;
        if (val < 0) val = 0;
        if (!isNaN(val)) {
            input.value = String(val).padStart(2, '0');
        } else {
            input.value = "00";
        }
    });
});