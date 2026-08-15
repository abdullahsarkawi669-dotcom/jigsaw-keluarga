// --- Konfigurasi & State ---
const ALLOWED_USERS = ['aisyah', 'fathimah', 'muhammad', 'maryam', 'ibrahim'];
let currentUser = '';
let currentImage = '';
let gridSize = 3;
let timerInterval = null;
let seconds = 0;
let currentGameMode = 'jigsaw';

// Elemen DOM
const screens = {
    login: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    game: document.getElementById('game-screen'),
    tetrisGame: document.getElementById('tetris-game-screen'),
    snakeGame: document.getElementById('snake-game-screen')
};

const usernameInput = document.getElementById('username');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');
const displayName = document.getElementById('display-name');
const btnLogout = document.getElementById('btn-logout');

const btnModeJigsaw = document.getElementById('btn-mode-jigsaw');
const btnModeTetris = document.getElementById('btn-mode-tetris');
const btnModeSnake = document.getElementById('btn-mode-snake');

const jigsawConfigPanel = document.getElementById('jigsaw-config-panel');
const tetrisConfigPanel = document.getElementById('tetris-config-panel');
const snakeConfigPanel = document.getElementById('snake-config-panel');

const imageSelect = document.getElementById('image-select');
const imagePreview = document.getElementById('image-preview');
const btnDiffs = document.querySelectorAll('.btn-diff');
const puzzleBoard = document.getElementById('puzzle-board');
const puzzlePieces = document.getElementById('puzzle-pieces');
const timerDisplay = document.getElementById('timer');
const currentLevelText = document.getElementById('current-level-text');

const btnStart = document.getElementById('btn-start');
const btnBack = document.getElementById('btn-back');
const btnTetrisBack = document.getElementById('btn-tetris-back');
const btnSnakeBack = document.getElementById('btn-snake-back');

const scoreList = document.getElementById('score-list');
const btnResetScore = document.getElementById('btn-reset-score');

// Modal
const winModal = document.getElementById('win-modal');
const winTimeDisplay = document.getElementById('win-time');
const newRecordMsg = document.getElementById('new-record-msg');
const btnPlayAgain = document.getElementById('btn-play-again');

// Inisialisasi Awal
window.onload = () => {
    currentImage = imageSelect.value;
    imagePreview.src = currentImage;
    
    const savedUser = sessionStorage.getItem('game_user');
    if (savedUser && ALLOWED_USERS.includes(savedUser)) {
        currentUser = savedUser;
        showScreen('dashboard');
        updateDashboard();
    }
};

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Autentikasi Login
btnLogin.addEventListener('click', () => {
    const name = usernameInput.value.trim().toLowerCase();
    if (ALLOWED_USERS.includes(name)) {
        currentUser = name;
        sessionStorage.setItem('game_user', name);
        loginError.textContent = '';
        showScreen('dashboard');
        updateDashboard();
    } else {
        loginError.textContent = 'Harap pilih nama pengguna dari daftar!';
    }
});

btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('game_user');
    currentUser = '';
    usernameInput.selectedIndex = 0;
    showScreen('login');
});

// Mode Switcher
function setActiveMode(mode) {
    currentGameMode = mode;
    btnModeJigsaw.classList.remove('active');
    btnModeTetris.classList.remove('active');
    btnModeSnake.classList.remove('active');
    
    jigsawConfigPanel.style.display = 'none';
    tetrisConfigPanel.style.display = 'none';
    snakeConfigPanel.style.display = 'none';

    if (mode === 'jigsaw') {
        btnModeJigsaw.classList.add('active');
        jigsawConfigPanel.style.display = 'block';
    } else if (mode === 'tetris') {
        btnModeTetris.classList.add('active');
        tetrisConfigPanel.style.display = 'block';
    } else if (mode === 'snake') {
        btnModeSnake.classList.add('active');
        snakeConfigPanel.style.display = 'block';
    }
    loadScores();
}

btnModeJigsaw.addEventListener('click', () => setActiveMode('jigsaw'));
btnModeTetris.addEventListener('click', () => setActiveMode('tetris'));
btnModeSnake.addEventListener('click', () => setActiveMode('snake'));

function updateDashboard() {
    displayName.textContent = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
    loadScores();
}

imageSelect.addEventListener('change', (e) => {
    currentImage = e.target.value;
    imagePreview.src = currentImage;
});

btnDiffs.forEach(btn => {
    btn.addEventListener('click', (e) => {
        btnDiffs.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        gridSize = parseInt(e.target.getAttribute('data-level'));
        currentLevelText.textContent = e.target.textContent.split(' ')[0];
    });
});

btnStart.addEventListener('click', () => {
    if (currentGameMode === 'jigsaw') {
        showScreen('game');
        initJigsawGame();
    } else if (currentGameMode === 'tetris') {
        showScreen('tetrisGame');
        initTetrisGame();
    } else if (currentGameMode === 'snake') {
        showScreen('snakeGame');
        initSnakeGame();
    }
});

btnBack.addEventListener('click', () => { stopTimer(); showScreen('dashboard'); });
btnTetrisBack.addEventListener('click', () => { stopTetris(); showScreen('dashboard'); });
btnSnakeBack.addEventListener('click', () => { stopSnake(); showScreen('dashboard'); });

// --- Rekor Skor LocalStorage ---
function getScores() {
    let key = 'jigsaw_scores_' + gridSize;
    if (currentGameMode === 'tetris') key = 'tetris_scores';
    if (currentGameMode === 'snake') key = 'snake_scores';
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveScore(val) {
    let key = 'jigsaw_scores_' + gridSize;
    if (currentGameMode === 'tetris') key = 'tetris_scores';
    if (currentGameMode === 'snake') key = 'snake_scores';
    
    let scores = JSON.parse(localStorage.getItem(key)) || [];
    scores.push({ user: currentUser, score: val, date: new Date().toLocaleDateString() });
    
    if (currentGameMode === 'jigsaw') {
        scores.sort((a, b) => a.score - b.score);
    } else {
        scores.sort((a, b) => b.score - a.score);
    }
    localStorage.setItem(key, JSON.stringify(scores));
}

function loadScores() {
    const scores = getScores();
    scoreList.innerHTML = '';
    if (scores.length === 0) {
        scoreList.innerHTML = '<li>Belum ada rekor tercatat.</li>';
        return;
    }
    
    scores.slice(0, 4).forEach((item, index) => {
        const li = document.createElement('li');
        let displayVal = currentGameMode === 'jigsaw' ? formatTime(item.score) : `${item.score} Poin`;
        li.innerHTML = `<span>${index + 1}. ${item.user.toUpperCase()}</span> <span>${displayVal}</span>`;
        scoreList.appendChild(li);
    });
}

btnResetScore.addEventListener('click', () => {
    if(confirm('Reset semua rekor untuk mode ini?')) {
        let key = 'jigsaw_scores_' + gridSize;
        if (currentGameMode === 'tetris') key = 'tetris_scores';
        if (currentGameMode === 'snake') key = 'snake_scores';
        localStorage.removeItem(key);
        loadScores();
    }
});

// --- Jigsaw Game Engine ---
let selectedPiece = null;
function initJigsawGame() {
    puzzleBoard.innerHTML = '';
    puzzlePieces.innerHTML = '';
    selectedPiece = null;
    
    puzzleBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    puzzleBoard.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    
    let piecesArray = [];
    const boardSizePx = 300;
    const pieceSize = boardSizePx / gridSize;

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const index = row * gridSize + col;
            const cell = document.createElement('div');
            cell.classList.add('board-cell');
            cell.setAttribute('data-index', index);
            
            cell.addEventListener('click', () => {
                if (selectedPiece) {
                    if (cell.children.length === 0) {
                        cell.appendChild(selectedPiece);
                    } else {
                        const existingPiece = cell.children[0];
                        puzzlePieces.appendChild(existingPiece);
                        cell.appendChild(selectedPiece);
                        existingPiece.classList.remove('correct');
                    }
                    selectedPiece.classList.remove('selected');
                    selectedPiece = null;
                    checkJigsawWin();
                }
            });
            puzzleBoard.appendChild(cell);

            const piece = document.createElement('div');
            piece.classList.add('puzzle-piece');
            piece.setAttribute('data-index', index);
            piece.style.backgroundImage = `url("${currentImage}")`;
            piece.style.backgroundSize = `${boardSizePx}px ${boardSizePx}px`;
            piece.style.backgroundPosition = `-${col * pieceSize}px -${row * pieceSize}px`;
            piece.style.width = `${pieceSize - 2}px`;
            piece.style.height = `${pieceSize - 2}px`;
            
            piece.addEventListener('click', (e) => {
                e.stopPropagation();
                if (piece.classList.contains('correct')) return;
                if (selectedPiece === piece) {
                    piece.classList.remove('selected');
                    selectedPiece = null;
                } else {
                    if (selectedPiece) selectedPiece.classList.remove('selected');
                    selectedPiece = piece;
                    piece.classList.add('selected');
                }
            });
            piecesArray.push(piece);
        }
    }
    piecesArray.sort(() => Math.random() - 0.5);
    piecesArray.forEach(p => puzzlePieces.appendChild(p));

    resetTimer();
    startTimer();
}

function checkJigsawWin() {
    const cells = document.querySelectorAll('.board-cell');
    let correctCount = 0;
    cells.forEach(cell => {
        if (cell.children.length > 0) {
            const piece = cell.children[0];
            if (cell.getAttribute('data-index') === piece.getAttribute('data-index')) {
                correctCount++;
                piece.classList.add('correct');
            } else {
                piece.classList.remove('correct');
            }
        }
    });
    if (correctCount === gridSize * gridSize) {
        stopTimer();
        saveScore(seconds);
        showWinModal();
    }
}

// --- Tetris Game Engine ---
let tetrisInterval = null;
function initTetrisGame() {
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('tetris-score');
    
    const ROWS = 20, COLS = 10, BLOCK_SIZE = 20;
    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    let score = 0;
    scoreEl.textContent = score;

    const SHAPES = [
        [[1,1,1,1]], // I
        [[1,1],[1,1]], // O
        [[0,1,0],[1,1,1]], // T
        [[1,0,0],[1,1,1]], // L
        [[0,0,1],[1,1,1]], // J
        [[0,1,1],[1,1,0]], // S
        [[1,1,0],[0,1,1]]  // Z
    ];
    const COLORS = ['', '#38bdf8', '#facc15', '#c084fc', '#fb923c', '#60a5fa', '#4ade80', '#f87171'];

    let currentPiece = {
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: Math.floor(Math.random() * 7) + 1,
        x: 3, y: 0
    };

    function draw() {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Gambar Papan
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    ctx.fillStyle = COLORS[board[r][c]];
                    ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
        // Gambar Blok Aktif
        currentPiece.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val) {
                    ctx.fillStyle = COLORS[currentPiece.color];
                    ctx.fillRect((currentPiece.x + c) * BLOCK_SIZE, (currentPiece.y + r) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            });
        });
    }

    function collide(offsetX, offsetY, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    let newX = currentPiece.x + c + offsetX;
                    let newY = currentPiece.y + r + offsetY;
                    if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                    if (newY >= 0 && board[newY][newX]) return true;
                }
            }
        }
        return false;
    }

    function merge() {
        currentPiece.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val && currentPiece.y + r >= 0) {
                    board[currentPiece.y + r][currentPiece.x + c] = currentPiece.color;
                }
            });
        });
    }

    function clearLines() {
        let lines = 0;
        outer: for (let r = ROWS - 1; r >= 0; r--) {
            for (let c = 0; c < COLS; c++) {
                if (!board[r][c]) continue outer;
            }
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            lines++;
            r++;
        }
        if (lines > 0) {
            score += lines * 100;
            scoreEl.textContent = score;
            saveScore(score);
        }
    }

    function drop() {
        if (!collide(0, 1, currentPiece.shape)) {
            currentPiece.y++;
        } else {
            merge();
            clearLines();
            currentPiece = {
                shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
                color: Math.floor(Math.random() * 7) + 1,
                x: 3, y: 0
            };
            if (collide(0, 0, currentPiece.shape)) {
                alert('Game Over! Skor Anda: ' + score);
                board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
                score = 0;
                scoreEl.textContent = score;
            }
        }
        draw();
    }

    document.getElementById('tetris-left').onclick = () => { if (!collide(-1, 0, currentPiece.shape)) currentPiece.x--; draw(); };
    document.getElementById('tetris-right').onclick = () => { if (!collide(1, 0, currentPiece.shape)) currentPiece.x++; draw(); };
    document.getElementById('tetris-down').onclick = drop;
    document.getElementById('tetris-rotate').onclick = () => {
        const rotated = currentPiece.shape[0].map((_, i) => currentPiece.shape.map(row => row[i]).reverse());
        if (!collide(0, 0, rotated)) currentPiece.shape = rotated;
        draw();
    };

    if (tetrisInterval) clearInterval(tetrisInterval);
    tetrisInterval = setInterval(drop, 500);
    draw();
}

function stopTetris() { clearInterval(tetrisInterval); }

// --- Snake Game Engine ---
let snakeInterval = null;
function initSnakeGame() {
    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('snake-score');
    
    const gridSize = 15;
    const tileCount = 20;
    let snake = [{ x: 10, y: 10 }];
    let food = { x: 5, y: 5 };
    let dx = 1, dy = 0;
    let score = 0;
    scoreEl.textContent = score;

    function gameLoop() {
        // Gerak ular
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        
        // Tabrak dinding
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || 
            snake.some(part => part.x === head.x && part.y === head.y)) {
            alert('Game Over! Skor Snake: ' + score);
            snake = [{ x: 10, y: 10 }];
            score = 0;
            scoreEl.textContent = score;
            dx = 1; dy = 0;
        }

        snake.unshift(head);

        // Makan buah
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            scoreEl.textContent = score;
            saveScore(score);
            food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
        } else {
            snake.pop();
        }

        // Render Canvas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gambar Makanan (Buah Merah)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);

        // Gambar Ular (Warna-warni Hijau)
        snake.forEach((part, index) => {
            ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e';
            ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
        });
    }

    document.getElementById('snake-up').onclick = () => { if (dy === 0) { dx = 0; dy = -1; } };
    document.getElementById('snake-down').onclick = () => { if (dy === 0) { dx = 0; dy = 1; } };
    document.getElementById('snake-left').onclick = () => { if (dx === 0) { dx = -1; dy = 0; } };
    document.getElementById('snake-right').onclick = () => { if (dx === 0) { dx = 1; dy = 0; } };

    if (snakeInterval) clearInterval(snakeInterval);
    snakeInterval = setInterval(gameLoop, 130);
}

function stopSnake() { clearInterval(snakeInterval); }

// --- Timer Jigsaw ---
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

function stopTimer() { clearInterval(timerInterval); }
function resetTimer() { stopTimer(); seconds = 0; timerDisplay.textContent = '00:00'; }

function showWinModal() {
    winTimeDisplay.textContent = formatTime(seconds);
    winModal.classList.add('active');
}

btnPlayAgain.addEventListener('click', () => {
    winModal.classList.remove('active');
    loadScores();
    initJigsawGame();
});
