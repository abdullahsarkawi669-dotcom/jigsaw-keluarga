// --- Konfigurasi & State ---
const ALLOWED_USERS = ['aisyah', 'fathimah', 'muhammad', 'maryam', 'ibrahim'];
let currentUser = '';
let currentImage = '';
let gridSize = 3;
let timerInterval = null;
let seconds = 0;
let currentGameMode = 'jigsaw';
let selectedQuestionCount = 10;

// Elemen DOM
const screens = {
    login: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    game: document.getElementById('game-screen'),
    tetrisGame: document.getElementById('tetris-game-screen'),
    ttsGame: document.getElementById('tts-game-screen')
};

const usernameInput = document.getElementById('username');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');
const displayName = document.getElementById('display-name');
const btnLogout = document.getElementById('btn-logout');

const btnModeJigsaw = document.getElementById('btn-mode-jigsaw');
const btnModeTetris = document.getElementById('btn-mode-tetris');
const btnModeTTS = document.getElementById('btn-mode-tts');

const jigsawConfigPanel = document.getElementById('jigsaw-config-panel');
const tetrisConfigPanel = document.getElementById('tetris-config-panel');
const ttsConfigPanel = document.getElementById('tts-config-panel');

const imageSelect = document.getElementById('image-select');
const imagePreview = document.getElementById('image-preview');
const btnDiffs = document.querySelectorAll('.btn-diff');
const btnTtsCounts = document.querySelectorAll('.btn-tts-count');

const puzzleBoard = document.getElementById('puzzle-board');
const puzzlePieces = document.getElementById('puzzle-pieces');
const timerDisplay = document.getElementById('timer');
const currentLevelText = document.getElementById('current-level-text');

const btnStart = document.getElementById('btn-start');
const btnBack = document.getElementById('btn-back');
const btnTetrisBack = document.getElementById('btn-tetris-back');
const btnTTSStop = document.getElementById('btn-tts-stop');

const scoreList = document.getElementById('score-list');
const btnResetScore = document.getElementById('btn-reset-score');

// Modal
const winModal = document.getElementById('win-modal');
const winTimeDisplay = document.getElementById('win-time');
const newRecordMsg = document.getElementById('new-record-msg');
const btnPlayAgain = document.getElementById('btn-play-again');

// TTS Result Modal
const ttsResultModal = document.getElementById('tts-result-modal');
const ttsFinalScore = document.getElementById('tts-final-score');
const ttsCongratsMsg = document.getElementById('tts-congrats-msg');
const btnTtsCloseModal = document.getElementById('btn-tts-close-modal');

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
    btnModeTTS.classList.remove('active');
    
    jigsawConfigPanel.style.display = 'none';
    tetrisConfigPanel.style.display = 'none';
    ttsConfigPanel.style.display = 'none';

    if (mode === 'jigsaw') {
        btnModeJigsaw.classList.add('active');
        jigsawConfigPanel.style.display = 'block';
    } else if (mode === 'tetris') {
        btnModeTetris.classList.add('active');
        tetrisConfigPanel.style.display = 'block';
    } else if (mode === 'tts') {
        btnModeTTS.classList.add('active');
        ttsConfigPanel.style.display = 'block';
    }
    loadScores();
}

btnModeJigsaw.addEventListener('click', () => setActiveMode('jigsaw'));
btnModeTetris.addEventListener('click', () => setActiveMode('tetris'));
btnModeTTS.addEventListener('click', () => setActiveMode('tts'));

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

btnTtsCounts.forEach(btn => {
    btn.addEventListener('click', (e) => {
        btnTtsCounts.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedQuestionCount = parseInt(e.target.getAttribute('data-count'));
    });
});

btnStart.addEventListener('click', () => {
    if (currentGameMode === 'jigsaw') {
        showScreen('game');
        initJigsawGame();
    } else if (currentGameMode === 'tetris') {
        showScreen('tetrisGame');
        initTetrisGame();
    } else if (currentGameMode === 'tts') {
        showScreen('ttsGame');
        initTTSGame();
    }
});

btnBack.addEventListener('click', () => { stopTimer(); showScreen('dashboard'); });
btnTetrisBack.addEventListener('click', () => { stopTetris(); showScreen('dashboard'); });

// --- Rekor Skor LocalStorage ---
function getScores() {
    let key = 'jigsaw_scores_' + gridSize;
    if (currentGameMode === 'tetris') key = 'tetris_scores';
    if (currentGameMode === 'tts') key = 'tts_scores_' + selectedQuestionCount;
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveScore(val) {
    let key = 'jigsaw_scores_' + gridSize;
    if (currentGameMode === 'tetris') key = 'tetris_scores';
    if (currentGameMode === 'tts') key = 'tts_scores_' + selectedQuestionCount;
    
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
        if (currentGameMode === 'tts') key = 'tts_scores_' + selectedQuestionCount;
        localStorage.removeItem(key);
        loadScores();
    }
});

// --- Jigsaw Game Engine (Fullscreen Mepet Pinggir) ---
let selectedPiece = null;
function initJigsawGame() {
    puzzleBoard.innerHTML = '';
    puzzlePieces.innerHTML = '';
    selectedPiece = null;
    
    puzzleBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    puzzleBoard.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    
    let piecesArray = [];
    const boardSizePx = Math.min(window.innerWidth * 0.96, 420);
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
        [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]],
        [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]]
    ];
    const COLORS = ['', '#38bdf8', '#facc15', '#c084fc', '#fb923c', '#60a5fa', '#4ade80', '#f87171'];

    let currentPiece = {
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: Math.floor(Math.random() * 7) + 1,
        x: 3, y: 0
    };

    function draw() {
        ctx.fillStyle = '#060913';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    ctx.fillStyle = COLORS[board[r][c]];
                    ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
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

// --- Teka-Teki Silang (TTS) / Soal Harian Engine ---
const ttsQuestionsDatabase = [
    { q: "Siapa yang masih pakai popok? ...", answer: "IBROHIM" },
    { q: "Apa warna kucing di rumah...", answer: "OREN" },
    { q: "Binatang apa yang hidup di kolam...", answer: "LELE" },
    { q: "Apa nama makanan kucing...", answer: "EXCEL" },
    { q: "Apa warna mobil...", answer: "HIJAU" },
    { q: "Siapa nama ayahmu...", answer: "AGUS" },
    { q: "Siapa nama ibumu...", answer: "RIA" },
    { q: "Siapa yang biasanya memasak di rumah...", answer: "UMI" },
    { q: "Siapa yang biasanya pergi bekerja...", answer: "ABI" },
    { q: "Apa warna langit saat cerah...", answer: "BIRU" },
    { q: "Apa warna rumput...", answer: "HIJAU" },
    { q: "Apa warna susu...", answer: "PUTIH" },
    { q: "Apa warna pisang matang...", answer: "KUNING" },
    { q: "Apa warna tomat matang...", answer: "MERAH" },
    { q: "Apa warna jeruk...", answer: "ORANYE" },
    { q: "Binatang apa yang suka mengeong...", answer: "KUCING" },
    { q: "Binatang apa yang suka menggonggong...", answer: "ANJING" },
    { q: "Binatang apa yang bisa terbang...", answer: "BURUNG" },
    { q: "Binatang apa yang hidup di air...", answer: "IKAN" },
    { q: "Binatang apa yang menghasilkan telur...", answer: "AYAM" },
    { q: "Binatang apa yang menghasilkan susu...", answer: "SAPI" },
    { q: "Binatang apa yang suka makan wortel...", answer: "KELINCI" },
    { q: "Binatang apa yang memiliki belalai...", answer: "GAJAH" },
    { q: "Binatang apa yang memiliki leher panjang...", answer: "JERAPAH" },
    { q: "Binatang apa yang disebut raja hutan...", answer: "SINGA" },
    { q: "Apa makanan pokok orang Indonesia...", answer: "NASI" },
    { q: "Apa makanan dari tepung berbentuk bulat panjang...", answer: "ROTI" },
    { q: "Apa minuman yang berasal dari sapi...", answer: "SUSU" },
    { q: "Apa minuman paling sering saat haus...", answer: "AIR" },
    { q: "Buah kuning dan panjang...", answer: "PISANG" },
    { q: "Alat untuk menulis di buku...", answer: "PENSIL" },
    { q: "Alat untuk menghapus tulisan pensil...", answer: "PENGHAPUS" },
    { q: "Alat untuk mengukur panjang...", answer: "PENGGARIS" },
    { q: "Tempat menyimpan buku di sekolah...", answer: "TAS" },
    { q: "Siapa yang mengajar di sekolah...", answer: "GURU" },
    { q: "Alat untuk melihat waktu...", answer: "JAM" },
    { q: "Alat untuk menelepon...", answer: "HP" },
    { q: "Alat untuk mengambil foto...", answer: "KAMERA" },
    { q: "Benda yang menghasilkan cahaya malam...", answer: "LAMPU" },
    { q: "Benda untuk membuka pintu...", answer: "KUNCI" },
    { q: "Alat untuk menyapu lantai...", answer: "SAPU" },
    { q: "Alat untuk mengepel lantai...", answer: "PEL" },
    { q: "Alat untuk makan nasi...", answer: "SENDOK" },
    { q: "Alat untuk memotong makanan...", answer: "PISAU" },
    { q: "Tempat untuk minum air...", answer: "GELAS" },
    { q: "Tempat memasak nasi...", answer: "PENANAK NASI" },
    { q: "Alat untuk memasak air...", answer: "KETEL" },
    { q: "Penyimpanan makanan agar dingin...", answer: "KULKAS" },
    { q: "Sabun untuk mencuci...", answer: "SABUN" },
    { q: "Alat membersihkan gigi...", answer: "SIKAT GIGI" },
    { q: "Pasta pembersih gigi...", answer: "PASTA GIGI" },
    { q: "Yang dipakai di kepala...", answer: "TOPI" },
    { q: "Yang dipakai di kaki...", answer: "SEPATU" },
    { q: "Yang dipakai saat hujan...", answer: "PAYUNG" },
    { q: "Pakaian untuk tidur...", answer: "PIYAMA" },
    { q: "Pakaian penghangat tubuh...", answer: "JAKET" },
    { q: "Kendaraan roda dua...", answer: "SEPEDA" },
    { q: "Kendaraan roda empat...", answer: "MOBIL" },
    { q: "Kendaraan di atas rel...", answer: "KERETA" },
    { q: "Kendaraan terbang di udara...", answer: "PESAWAT" },
    { q: "Kendaraan berjalan di laut...", answer: "KAPAL" },
    { q: "Lampu lalu lintas berhenti...", answer: "MERAH" },
    { q: "Lampu lalu lintas berjalan...", answer: "HIJAU" },
    { q: "Lampu lalu lintas bersiap...", answer: "KUNING" },
    { q: "Pelindung kepala pengendara...", answer: "HELM" },
    { q: "Tempat isi bensin...", answer: "SPBU" },
    { q: "Muncul pada siang hari...", answer: "MATAHARI" },
    { q: "Muncul di langit malam...", answer: "BULAN" },
    { q: "Berkelap-kelip malam hari...", answer: "BINTANG" },
    { q: "Turun dari langit saat hujan...", answer: "AIR" },
    { q: "Jumlah jari tangan kanan...", answer: "LIMA" },
    { q: "Jumlah kaki manusia...", answer: "DUA" },
    { q: "Jumlah mata manusia...", answer: "DUA" },
    { q: "Alat untuk melihat...", answer: "MATA" },
    { q: "Alat untuk mendengar...", answer: "TELINGA" },
    { q: "Alat untuk mencium bau...", answer: "HIDUNG" },
    { q: "Alat untuk mengecap rasa...", answer: "LIDAH" },
    { q: "Alat untuk berjalan...", answer: "KAKI" },
    { q: "Alat untuk memegang...", answer: "TANGAN" },
    { q: "Tempat tidur di kamar...", answer: "TEMPAT TIDUR" },
    { q: "Alas kepala saat tidur...", answer: "BANTAL" },
    { q: "Penutup tubuh saat tidur...", answer: "SELIMUT" },
    { q: "Ruangan untuk memasak...", answer: "DAPUR" },
    { q: "Ruangan untuk tidur...", answer: "KAMAR" },
    { q: "Ruangan menerima tamu...", answer: "RUANG TAMU" },
    { q: "Tempat untuk mandi...", answer: "KAMAR MANDI" }
];

let activeTTSQuestions = [];
let currentTTSIndex = 0;
let ttsScore = 0;

function initTTSGame() {
    currentTTSIndex = 0;
    ttsScore = 0;
    document.getElementById('tts-score').textContent = ttsScore;
    document.getElementById('tts-user-label').textContent = currentUser.toUpperCase();
    
    let shuffled = [...ttsQuestionsDatabase].sort(() => 0.5 - Math.random());
    activeTTSQuestions = shuffled.slice(0, selectedQuestionCount);
    
    loadTTSQuestion();
}

function loadTTSQuestion() {
    if (currentTTSIndex >= activeTTSQuestions.length) {
        finishTTSGame();
        return;
    }

    const currentData = activeTTSQuestions[currentTTSIndex];
    document.getElementById('tts-question').textContent = `Soal ${currentTTSIndex + 1} dari ${activeTTSQuestions.length}: ${currentData.q}`;
    const inputField = document.getElementById('tts-answer-input');
    inputField.value = '';
    document.getElementById('tts-feedback').textContent = '';

    renderTTSBoxes('');
    inputField.oninput = (e) => {
        renderTTSBoxes(e.target.value);
    };
}

function renderTTSBoxes(typedText) {
    const container = document.getElementById('tts-container');
    container.innerHTML = '';
    
    const currentData = activeTTSQuestions[currentTTSIndex];
    const words = currentData.answer.split(' ');
    const cleanTyped = typedText.trim().toUpperCase().replace(/\s+/g, '');
    
    let charIdx = 0;
    words.forEach((word, wordIdx) => {
        for (let i = 0; i < word.length; i++) {
            const cell = document.createElement('div');
            cell.classList.add('tts-cell');
            if (charIdx < cleanTyped.length) {
                cell.textContent = cleanTyped[charIdx];
                cell.classList.add('filled');
            } else {
                cell.textContent = '?';
            }
            container.appendChild(cell);
            charIdx++;
        }
        if (wordIdx < words.length - 1) {
            const spaceDiv = document.createElement('div');
            spaceDiv.classList.add('tts-space');
            container.appendChild(spaceDiv);
        }
    });
}

document.getElementById('btn-tts-submit').onclick = () => {
    const userAns = document.getElementById('tts-answer-input').value.trim().toUpperCase();
    const currentData = activeTTSQuestions[currentTTSIndex];
    const cleanAns = currentData.answer.replace(/\s+/g, '');
    const userAnsClean = userAns.replace(/\s+/g, '');
    const feedback = document.getElementById('tts-feedback');

    if (userAnsClean === cleanAns) {
        feedback.style.color = '#34d399';
        feedback.textContent = 'Benar! Hebat sekali!';
        ttsScore += Math.floor(100 / activeTTSQuestions.length);
        document.getElementById('tts-score').textContent = ttsScore;

        const cells = document.querySelectorAll('.tts-cell');
        let idx = 0;
        cells.forEach((cell) => {
            cell.textContent = cleanAns[idx];
            cell.classList.add('filled');
            idx++;
        });

        currentTTSIndex++;
        setTimeout(loadTTSQuestion, 1200);
    } else {
        feedback.style.color = '#f87171';
        feedback.textContent = 'Kurang tepat, coba lagi ya!';
        
        // Animasi merah menyala pada sel
        const cells = document.querySelectorAll('.tts-cell');
        cells.forEach(cell => {
            cell.classList.add('shake-error');
            setTimeout(() => cell.classList.remove('shake-error'), 400);
        });
    }
};

// Tombol Stop Tes Harian
document.getElementById('btn-tts-stop').onclick = () => {
    if (confirm('Yakin ingin berhenti dan langsung melihat skor saat ini?')) {
        finishTTSGame();
    }
};

function finishTTSGame() {
    saveScore(ttsScore);
    const capitalizedUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
    ttsCongratsMsg.textContent = `Selamat ${capitalizedUser} telah menyelesaikan tes ini!`;
    ttsFinalScore.textContent = ttsScore;
    ttsResultModal.classList.add('active');
}

btnTtsCloseModal.onclick = () => {
    ttsResultModal.classList.remove('active');
    showScreen('dashboard');
    loadScores();
};

// --- Timer Jigsaw & Modal ---
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
