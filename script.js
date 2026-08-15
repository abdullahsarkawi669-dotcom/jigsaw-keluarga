// --- Konfigurasi ---
const ALLOWED_USERS = ['aisyah', 'fathimah', 'muhammad', 'maryam', 'ibrahim'];
let currentUser = '';
let currentImage = '';
let gridSize = 3; // Default Mudah
let timerInterval = null;
let seconds = 0;
let isPlaying = false;

// --- Elemen DOM ---
const screens = {
    login: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    game: document.getElementById('game-screen')
};

// Login Elements
const usernameInput = document.getElementById('username');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');

// Dashboard Elements
const displayName = document.getElementById('display-name');
const btnLogout = document.getElementById('btn-logout');
const imageSelect = document.getElementById('image-select');
const imagePreview = document.getElementById('image-preview');
const btnDiffs = document.querySelectorAll('.btn-diff');
const btnStart = document.getElementById('btn-start');
const scoreList = document.getElementById('score-list');
const btnResetScore = document.getElementById('btn-reset-score');

// Game Elements
const puzzleBoard = document.getElementById('puzzle-board');
const puzzlePieces = document.getElementById('puzzle-pieces');
const timerDisplay = document.getElementById('timer');
const currentLevelText = document.getElementById('current-level-text');
const btnBack = document.getElementById('btn-back');

// Modal
const winModal = document.getElementById('win-modal');
const winTimeDisplay = document.getElementById('win-time');
const newRecordMsg = document.getElementById('new-record-msg');
const btnPlayAgain = document.getElementById('btn-play-again');

// --- Inisialisasi ---
window.onload = () => {
    // Set default image from dropdown
    currentImage = imageSelect.value;
    imagePreview.src = currentImage;
    
    const savedUser = sessionStorage.getItem('jigsaw_user');
    if (savedUser && ALLOWED_USERS.includes(savedUser)) {
        currentUser = savedUser;
        showScreen('dashboard');
        updateDashboard();
    }
};

// --- Navigasi ---
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// --- Autentikasi ---
btnLogin.addEventListener('click', () => {
    const name = usernameInput.value.trim().toLowerCase();
    if (ALLOWED_USERS.includes(name)) {
        currentUser = name;
        sessionStorage.setItem('jigsaw_user', name);
        loginError.textContent = '';
        showScreen('dashboard');
        updateDashboard();
    } else {
        loginError.textContent = 'Nama pengguna tidak diizinkan. Cek kembali!';
        // Fallback animation if needed, though dropdown is always valid
        usernameInput.parentElement.classList.add('shake');
        setTimeout(() => usernameInput.parentElement.classList.remove('shake'), 500);
    }
});

btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('jigsaw_user');
    currentUser = '';
    showScreen('login');
});

// --- Dashboard Logic ---
function updateDashboard() {
    displayName.textContent = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
    loadScores();
}

// Image Dropdown Handling
imageSelect.addEventListener('change', (e) => {
    currentImage = e.target.value;
    // Set fallback image if local image is broken/not found
    imagePreview.onerror = function() {
        // Prevent infinite loop if fallback also fails
        imagePreview.onerror = null; 
        imagePreview.src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=500&q=80";
        console.warn("Gambar lokal tidak ditemukan. Pastikan file ada di folder yang sama.");
    };
    imagePreview.src = currentImage;
});

// Difficulty Selection
btnDiffs.forEach(btn => {
    btn.addEventListener('click', (e) => {
        btnDiffs.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        gridSize = parseInt(e.target.getAttribute('data-level'));
        currentLevelText.textContent = e.target.textContent.split(' ')[0];
    });
});

// Start Game
btnStart.addEventListener('click', () => {
    showScreen('game');
    initGame();
});

btnBack.addEventListener('click', () => {
    stopTimer();
    showScreen('dashboard');
});

// --- Sistem Rekor (Local Storage) ---
function getScores() {
    const scores = JSON.parse(localStorage.getItem('jigsaw_scores')) || {};
    if (!scores[gridSize]) scores[gridSize] = [];
    return scores;
}

function saveScore(timeInSeconds) {
    const scores = getScores();
    scores[gridSize].push({
        user: currentUser,
        time: timeInSeconds,
        date: new Date().toLocaleDateString()
    });
    scores[gridSize].sort((a, b) => a.time - b.time);
    localStorage.setItem('jigsaw_scores', JSON.stringify(scores));
    
    if (scores[gridSize][0].time === timeInSeconds && scores[gridSize][0].user === currentUser) {
        newRecordMsg.style.display = 'block';
    } else {
        newRecordMsg.style.display = 'none';
    }
}

function loadScores() {
    const scores = getScores()[gridSize];
    scoreList.innerHTML = '';
    if (scores.length === 0) {
        scoreList.innerHTML = '<li>Belum ada rekor di level ini.</li>';
        return;
    }
    
    scores.slice(0, 5).forEach((score, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${index + 1}. ${score.user.toUpperCase()}</span> <span>${formatTime(score.time)}</span>`;
        scoreList.appendChild(li);
    });
}

btnResetScore.addEventListener('click', () => {
    if(confirm('Yakin ingin mereset semua rekor?')) {
        localStorage.removeItem('jigsaw_scores');
        loadScores();
    }
});

btnDiffs.forEach(btn => {
    btn.addEventListener('click', loadScores);
});

// --- Game Logic ---
function initGame() {
    puzzleBoard.innerHTML = '';
    puzzlePieces.innerHTML = '';
    
    puzzleBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    puzzleBoard.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    
    let piecesArray = [];

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const index = row * gridSize + col;
            
            // Cell (Target Drop)
            const cell = document.createElement('div');
            cell.classList.add('board-cell');
            cell.setAttribute('data-index', index);
            
            cell.addEventListener('dragover', dragOver);
            cell.addEventListener('dragenter', dragEnter);
            cell.addEventListener('dragleave', dragLeave);
            cell.addEventListener('drop', dropPiece);
            
            puzzleBoard.appendChild(cell);

            // Piece (Potongan yang bisa didrag)
            const piece = document.createElement('div');
            piece.classList.add('puzzle-piece');
            piece.setAttribute('draggable', 'true');
            piece.setAttribute('data-index', index);
            
            // FIX: Menambahkan tanda kutip pada URL agar bisa membaca tanda kurung ()
            piece.style.backgroundImage = `url("${currentImage}")`;
            piece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
            piece.style.backgroundPosition = `${(col * 100) / (gridSize - 1)}% ${(row * 100) / (gridSize - 1)}%`;
            
            piece.style.width = `${400 / gridSize - 2}px`; 
            piece.style.height = `${400 / gridSize - 2}px`;
            
            piece.addEventListener('dragstart', dragStart);
            piece.addEventListener('dragend', dragEnd);
            
            piecesArray.push(piece);
        }
    }

    piecesArray.sort(() => Math.random() - 0.5);
    piecesArray.forEach(p => puzzlePieces.appendChild(p));

    resetTimer();
    startTimer();
    isPlaying = true;
}

// --- Drag & Drop Handlers ---
let draggedPiece = null;

function dragStart(e) {
    draggedPiece = this;
    setTimeout(() => this.style.opacity = '0.5', 0);
}

function dragEnd() {
    setTimeout(() => this.style.opacity = '1', 0);
    draggedPiece = null;
    checkWinCondition();
}

function dragOver(e) { e.preventDefault(); }
function dragEnter(e) { 
    e.preventDefault(); 
    this.style.background = 'rgba(255,255,255,0.2)'; 
}
function dragLeave() { 
    this.style.background = 'rgba(255,255,255,0.05)'; 
}

function dropPiece(e) {
    this.style.background = 'rgba(255,255,255,0.05)';
    if (this.children.length === 0) {
        this.appendChild(draggedPiece);
        const pieceIndex = draggedPiece.getAttribute('data-index');
        const cellIndex = this.getAttribute('data-index');
        
        if (pieceIndex === cellIndex) {
            draggedPiece.classList.add('correct');
            draggedPiece.setAttribute('draggable', 'false');
        } else {
            draggedPiece.classList.remove('correct');
            draggedPiece.setAttribute('draggable', 'true');
        }
    } else {
        puzzlePieces.appendChild(draggedPiece);
    }
}

puzzlePieces.addEventListener('dragover', e => e.preventDefault());
puzzlePieces.addEventListener('drop', function(e) {
    this.appendChild(draggedPiece);
    draggedPiece.classList.remove('correct');
    draggedPiece.setAttribute('draggable', 'true');
});

// --- Pengecekan Menang ---
function checkWinCondition() {
    const cells = document.querySelectorAll('.board-cell');
    let correctCount = 0;
    
    cells.forEach(cell => {
        if (cell.children.length > 0) {
            const piece = cell.children[0];
            if (cell.getAttribute('data-index') === piece.getAttribute('data-index')) {
                correctCount++;
            }
        }
    });
    
    if (correctCount === gridSize * gridSize) {
        stopTimer();
        saveScore(seconds);
        showWinModal();
    }
}

// --- Timer ---
function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        timerDisplay.textContent = formatTime(seconds);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function resetTimer() {
    stopTimer();
    seconds = 0;
    timerDisplay.textContent = '00:00';
}

// --- Win Modal ---
function showWinModal() {
    winTimeDisplay.textContent = formatTime(seconds);
    winModal.classList.add('active');
}

btnPlayAgain.addEventListener('click', () => {
    winModal.classList.remove('active');
    loadScores();
    initGame();
});
