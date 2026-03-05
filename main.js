// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3Lh0DlmwAToER7RxqBUwlV7IaFyzEvBs",
  authDomain: "tirivagames-dilanurlaila.firebaseapp.com",
  databaseURL:
    "https://tirivagames-dilanurlaila-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tirivagames-dilanurlaila",
  storageBucket: "tirivagames-dilanurlaila.firebasestorage.app",
  messagingSenderId: "475362527223",
  appId: "1:475362527223:web:5a4a70cae9945cd597d0f2",
  measurementId: "G-0JW46325PF",
};

// ---------------------- Imports ----------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  get,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.warn(
    "Firebase not initialized. App will run locally but leaderboard disabled."
  );
}

document.addEventListener('DOMContentLoaded', () => {

    const sounds = {
        click: document.getElementById('soundClick'),
        correct: document.getElementById('soundCorrect'),
        wrong: document.getElementById('soundWrong'),
        success: document.getElementById('soundSuccess'),
        fail: document.getElementById('soundFail'),
        musicLobby: document.getElementById('soundMusicLobby'),
        musicGame: document.getElementById('soundMusicGame'),
    };
    function playSound(type) { if (sounds[type]) { sounds[type].currentTime = 0; sounds[type].play().catch(e => {}); } }
    function stopAllMusic() { if (sounds.musicLobby) sounds.musicLobby.pause(); if (sounds.musicGame) sounds.musicGame.pause(); }
    function playLobbyMusic() { stopAllMusic(); if (sounds.musicLobby) { sounds.musicLobby.currentTime = 0; sounds.musicLobby.play().catch(e => {}); } }
    function playGameMusic() { stopAllMusic(); if (sounds.musicGame) { sounds.musicGame.currentTime = 0; sounds.musicGame.play().catch(e => {}); } }
    const screens = { welcome: document.getElementById("welcomeScreen"), setup: document.getElementById("setupScreen"), loading: document.getElementById("loadingScreen"), game: document.getElementById("gameScreen"), review: document.getElementById("reviewScreen"), results: document.getElementById("resultsScreen"), leaderboard: document.getElementById("leaderboardScreen"), };
    const welcomeScreen = document.getElementById("welcomeScreen");
    const playerName = document.getElementById("playerName");
    const photoPreview = document.getElementById("photoPreview");
    const photoInput = document.getElementById("photoInput");
    const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
    const takePhotoBtn = document.getElementById("takePhotoBtn");
    const kelasSelect = document.getElementById("kelasSelect");
    const startBtn = document.getElementById("startBtn");
    const quizStatusMessage = document.getElementById("quizStatusMessage");
    const viewLeaderboardBtn = document.getElementById("viewLeaderboardBtn");
    const globalTimerEl = document.getElementById("globalTimer");
    const qIdx = document.getElementById("qIdx");
    const qTotal = document.getElementById("qTotal");
    const qText = document.getElementById("qText");
    const qImage = document.getElementById("qImage");
    const optionsEl = document.getElementById("options");
    const matchContainer = document.getElementById("matchContainer");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const finishBtn = document.getElementById("finishBtn");
    const reviewList = document.getElementById("reviewList");
    const goToLeaderboardBtn = document.getElementById("goToLeaderboardBtn");
    const finalScoreDisplay = document.getElementById("finalScoreDisplay");
    const leaderList = document.getElementById("leaderList");
    const playAgainBtn = document.getElementById("playAgainBtn");
    const resetLeaderboardBtn = document.getElementById("resetLeaderboardBtn");
    const leaderboardKelasSelect = document.getElementById("leaderboardKelasSelect");
    const leaderboardViewList = document.getElementById("leaderboardViewList");
    const backToSetupBtn = document.getElementById("backToSetupBtn");
    
    welcomeScreen.addEventListener('click', () => { 
        showScreen('setup'); 
        playLobbyMusic();
    }, { once: true });
    
    if (db) {
        const gameStateRef = ref(db, 'gameState');
        onValue(gameStateRef, (snapshot) => {
            const state = snapshot.val();
            const isQuizActive = state && state.isQuizActive;
            if (isQuizActive) {
                startBtn.disabled = false;
                quizStatusMessage.textContent = 'Kuis telah dibuka. Silakan mulai!';
                quizStatusMessage.className = 'small status-message active';
            } else {
                startBtn.disabled = true;
                quizStatusMessage.textContent = 'Kuis belum dimulai atau sudah ditutup. Mohon tunggu.';
                quizStatusMessage.className = 'small status-message inactive';
            }
        });
    } else {
        quizStatusMessage.textContent = 'Tidak terhubung ke server. Mode offline.';
    }

    let QUESTIONS = [];
    let TOTAL_POSSIBLE_SCORE = 0;
    async function loadQuestions() {
      if (!db) { alert("Koneksi ke Firebase gagal. Game tidak bisa dimulai."); return false; }
      const questionsRef = ref(db, 'questions');
      try {
        const snapshot = await get(questionsRef);
        if (snapshot.exists()) {
            const loadedQuestions = snapshot.val();
            QUESTIONS = Array.isArray(loadedQuestions) ? loadedQuestions : Object.values(loadedQuestions);
            TOTAL_POSSIBLE_SCORE = QUESTIONS.reduce((sum, q) => q.type === 'match' ? sum + (q.match_items?.length || 0) : sum + 1, 0);
            return true;
        } else {
            alert("Tidak ada soal di database."); QUESTIONS = []; return false;
        }
      } catch (e) { alert("Gagal memuat soal dari Firebase."); console.error(e); QUESTIONS = []; return false; }
    }

    function showScreen(screenName) {
      Object.values(screens).forEach((s) => (s.style.display = "none"));
      if (screens[screenName]) screens[screenName].style.display = 'flex';
      
      stopAllMusic(); 
      if (['setup', 'results', 'leaderboard', 'review', 'welcome'].includes(screenName)) playLobbyMusic(); 
      else if (screenName === 'game') playGameMusic();
    }

    let state;
    function resetState() { clearInterval(state?.timer); state = { idx: 0, score: 0, playerAnswers: [], timer: null, }; state.playerAnswers = new Array(QUESTIONS.length).fill(null); }
    
    let lastPhotoBase64 = null;
    uploadPhotoBtn.addEventListener("click", () => { playSound('click'); photoInput.click(); });
    photoInput.addEventListener("change", async (ev) => { const f = ev.target.files[0]; if (!f) return; lastPhotoBase64 = await toBase64(f); photoPreview.innerHTML = `<img src="${lastPhotoBase64}" />`; });
    takePhotoBtn.addEventListener("click", async () => { playSound('click'); try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }); const video = document.createElement("video"); video.autoplay = true; video.srcObject = stream; const modal = document.createElement("div"); Object.assign(modal.style, { position: "fixed", left: "0", top: "0", right: "0", bottom: "0", background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "1000" }); const box = document.createElement("div"); Object.assign(box.style, { background: "#0c1a32", padding: "16px", borderRadius: "12px", textAlign: "center" }); video.style.borderRadius = "8px"; video.style.maxWidth = "calc(100vw - 40px)"; box.appendChild(video); const buttonContainer = document.createElement("div"); buttonContainer.style.marginTop = "12px"; const snapBtn = document.createElement("button"); snapBtn.textContent = "Ambil Foto"; snapBtn.className = "btn"; const cancelBtn = document.createElement("button"); cancelBtn.textContent = "Batal"; cancelBtn.className = "btn ghost"; cancelBtn.style.marginLeft = "8px"; buttonContainer.appendChild(snapBtn); buttonContainer.appendChild(cancelBtn); box.appendChild(buttonContainer); modal.appendChild(box); document.body.appendChild(modal); const cleanup = () => { stream.getTracks().forEach((track) => track.stop()); modal.remove(); }; snapBtn.onclick = () => { playSound('click'); const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d").drawImage(video, 0, 0); lastPhotoBase64 = canvas.toDataURL("image/jpeg", 0.8); photoPreview.innerHTML = `<img src="${lastPhotoBase64}" />`; cleanup(); }; cancelBtn.onclick = cleanup; } catch (err) { console.error(err); alert("Tidak dapat mengakses kamera."); } });
    const toBase64 = (file) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
    
    function shuffle(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }
    
    startBtn.addEventListener("click", async () => { 
        if (!playerName.value) return alert("Masukkan nama dulu."); 
        if (!lastPhotoBase64) return alert("Ambil atau upload selfie."); 
        playSound('click'); 
        showScreen("loading"); 
        const questionsLoaded = await loadQuestions(); 
        if(!questionsLoaded || QUESTIONS.length === 0) { 
            alert("Gagal memuat soal, kuis tidak bisa dimulai.");
            showScreen("setup"); 
            return; 
        } 
        shuffle(QUESTIONS); 
        setTimeout(() => { resetState(); navigateToQuestion(0); startGlobalTimer(); showScreen("game"); }, 1500); 
    });

    viewLeaderboardBtn.addEventListener('click', () => { playSound('click'); showScreen('leaderboard'); fetchLeaderboard(leaderboardKelasSelect.value, leaderboardViewList); });
    backToSetupBtn.addEventListener('click', () => { playSound('click'); showScreen('setup'); });
    leaderboardKelasSelect.addEventListener('change', () => { fetchLeaderboard(leaderboardKelasSelect.value, leaderboardViewList); });

    // --- Fitur Anti-Curang: Deteksi Pindah Tab ---
    function handleVisibilityChange() {
        if (document.hidden && screens.game.style.display === 'flex') {
            clearInterval(state?.timer);
            stopAllMusic();
            location.reload();
        }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // --- Akhir Fitur Anti-Curang ---

    prevBtn.addEventListener('click', () => { if (state.idx > 0) { playSound('click'); navigateToQuestion(state.idx - 1); } });
    nextBtn.addEventListener('click', () => { if (state.idx < QUESTIONS.length - 1) { playSound('click'); navigateToQuestion(state.idx + 1); } });
    finishBtn.addEventListener('click', () => { playSound('click'); if(confirm("Yakin ingin menyelesaikan kuis?")) finishQuiz(); });
    playAgainBtn.addEventListener("click", () => { playSound('click'); resetState(); showScreen("setup"); });
    resetLeaderboardBtn.addEventListener('click', () => { playSound('click'); const adminPass = prompt("Masukkan kata sandi admin:"); if (adminPass === 'admin123') { const node = kelasSelect.value; if (confirm(`Yakin ingin mereset SEMUA skor untuk leaderboard ${node}?`)) { if (db) remove(ref(db, node)).then(() => alert('Leaderboard direset.')).catch((e) => alert('Gagal.')); else alert('Database tidak terhubung.'); } } else if(adminPass !== null) alert('Kata sandi salah.'); });
    goToLeaderboardBtn.addEventListener('click', () => { playSound('click'); showScreen('results'); renderResults(); });
    
    function navigateToQuestion(index) { 
        state.idx = index; 
        const cur = QUESTIONS[index]; 
        qIdx.textContent = index + 1; 
        qTotal.textContent = QUESTIONS.length; 
        qText.textContent = cur.q; 
        qImage.innerHTML = cur.img ? `<img src="${cur.img}" />` : ""; 
        optionsEl.style.display = 'none'; 
        matchContainer.style.display = 'none'; 
        if (cur.type === 'mcq') renderMCQ(cur, state.playerAnswers[index]); 
        else if (cur.type === 'match') renderMatch(cur, state.playerAnswers[index]); 
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible'; 
        nextBtn.style.display = index === QUESTIONS.length - 1 ? 'none' : 'block'; 
        finishBtn.style.display = index === QUESTIONS.length - 1 ? 'block' : 'none'; 
    }

    function renderMCQ(cur, prevAns) { 
        optionsEl.style.display = 'grid'; 
        optionsEl.innerHTML = ""; 
        cur.options.forEach((opt, i) => { 
            const d = document.createElement("button"); 
            d.className = "btn ghost opt"; 
            d.textContent = String.fromCharCode(65 + i) + ". " + opt; 
            if (prevAns === i) d.classList.add('selected'); 
            d.onclick = () => selectMCQOption(i, d); 
            optionsEl.appendChild(d); 
        }); 
    }

    function selectMCQOption(selIdx, selEl) { 
        playSound('click'); 
        state.playerAnswers[state.idx] = selIdx; 
        for (let opt of optionsEl.children) opt.classList.remove('selected'); 
        selEl.classList.add('selected'); 
    }

    // --- RENDER MATCH with TOUCH SUPPORT ---
    function renderMatch(cur, prevAns) {
        matchContainer.style.display = 'flex';
        matchContainer.innerHTML = "";
        const itemsCol = document.createElement('div');
        itemsCol.className = 'match-items';
        const labelsCol = document.createElement('div');
        labelsCol.className = 'match-labels';
        const shuffledLabels = [...cur.match_labels];
        shuffle(shuffledLabels);
        cur.match_items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'match-item';
            const dropZone = document.createElement('div');
            dropZone.className = 'drop-zone';
            dropZone.dataset.index = index;
            if (prevAns && prevAns[index]) {
                const prevLabelText = prevAns[index];
                const labelDiv = createLabel(prevLabelText);
                dropZone.appendChild(labelDiv);
                dropZone.classList.add('filled');
            }
            const img = document.createElement('img');
            img.src = item;
            itemDiv.appendChild(dropZone);
            itemDiv.appendChild(img);
            itemsCol.appendChild(itemDiv);
        });
        shuffledLabels.forEach((label) => {
            const isPlaced = prevAns && Object.values(prevAns).includes(label);
            if (!isPlaced) {
                const labelDiv = createLabel(label);
                labelsCol.appendChild(labelDiv);
            }
        });
        matchContainer.appendChild(itemsCol);
        matchContainer.appendChild(labelsCol);
        function createLabel(text) { const labelDiv = document.createElement('div'); labelDiv.className = 'match-label'; labelDiv.textContent = text; labelDiv.draggable = true; labelDiv.dataset.label = text; return labelDiv; }
        let draggedEl = null, ghostEl = null, currentDropZone = null;
        function handleDragStart(e) { draggedEl = e.target; e.dataTransfer?.setData('text/plain', null); }
        function handleTouchStart(e) { e.preventDefault(); draggedEl = e.target.closest('.match-label'); if (!draggedEl) return; ghostEl = draggedEl.cloneNode(true); ghostEl.classList.add('ghost'); document.body.appendChild(ghostEl); const touch = e.touches[0]; moveGhost(touch.pageX, touch.pageY); }
        function moveGhost(x, y) { if (!ghostEl) return; ghostEl.style.transform = `translate(${x}px, ${y}px)`; }
        function handleTouchMove(e) { e.preventDefault(); if (!ghostEl) return; const touch = e.touches[0]; moveGhost(touch.pageX, touch.pageY); ghostEl.style.display = 'none'; const elUnder = document.elementFromPoint(touch.clientX, touch.clientY); ghostEl.style.display = ''; const dropZone = elUnder?.closest('.drop-zone'); if (currentDropZone !== dropZone) { currentDropZone?.classList.remove('over'); currentDropZone = dropZone; currentDropZone?.classList.add('over'); } }
        function handleTouchEnd(e) { if (currentDropZone) { dropElement(currentDropZone); } ghostEl?.remove(); ghostEl = null; draggedEl = null; currentDropZone?.classList.remove('over'); currentDropZone = null; }
        function dropElement(zone) { if (!draggedEl) return; if (zone.hasChildNodes()) { labelsCol.appendChild(zone.firstChild); } zone.appendChild(draggedEl); zone.classList.add('filled'); if (!state.playerAnswers[state.idx] || typeof state.playerAnswers[state.idx] !== 'object') { state.playerAnswers[state.idx] = {}; } state.playerAnswers[state.idx][zone.dataset.index] = draggedEl.dataset.label; playSound('click'); }
        matchContainer.querySelectorAll('.match-label').forEach(label => { label.addEventListener('dragstart', handleDragStart); });
        matchContainer.querySelectorAll('.drop-zone').forEach(zone => { zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); }); zone.addEventListener('dragleave', () => zone.classList.remove('over')); zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); dropElement(zone); }); });
        matchContainer.querySelectorAll('.match-label').forEach(label => { label.addEventListener('touchstart', handleTouchStart, { passive: false }); });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    }
    
    function finishQuiz() { clearInterval(state.timer); calculateFinalScore(); showScreen('review'); renderReviewScreen(); }
    
    function calculateFinalScore() { 
        let correctPoints = 0; 
        QUESTIONS.forEach((q, i) => { 
            const ans = state.playerAnswers[i]; 
            if (ans === null || ans === undefined) return; 
            if (q.type === 'mcq') { 
                if(ans === q.answer) correctPoints++; 
            } else if (q.type === 'match' && typeof ans === 'object') { 
                Object.keys(ans).forEach(imgIndex => { 
                    if (ans[imgIndex] === q.match_labels[imgIndex]) { correctPoints++; } 
                }); 
            } 
        }); 
        state.score = correctPoints; 
    }
    
    function renderReviewScreen() { 
        reviewList.innerHTML = ''; 
        QUESTIONS.forEach((q, i) => { 
            const ans = state.playerAnswers[i]; 
            const item = document.createElement('div'); 
            item.className = 'review-item'; 
            let ansHTML = ''; 
            if (q.type === 'mcq') { 
                const correctTxt = q.options[q.answer]; 
                const playerTxt = ans !== null ? q.options[ans] : "Tidak Dijawab"; 
                const isCorrect = ans === q.answer; 
                ansHTML = `<div class="your-answer ${isCorrect ? 'correct' : ''}">Jawaban Anda: ${escapeHtml(playerTxt)}</div> ${!isCorrect ? `<div class="correct-answer">Jawaban Benar: ${escapeHtml(correctTxt)}</div>` : ''}`; 
            } else if (q.type === 'match') { 
                ansHTML = '<div class="review-match-container">'; 
                q.match_items.forEach((imgSrc, imgIndex) => { 
                    const playerLabel = ans && ans[imgIndex] ? ans[imgIndex] : "Tidak Dijawab"; 
                    const correctLabel = q.match_labels[imgIndex]; 
                    const isCorrect = playerLabel === correctLabel; 
                    ansHTML += `<div class="review-match-item"><img src="${imgSrc}" /><div class="your-answer ${isCorrect ? 'correct' : ''}">${escapeHtml(playerLabel)}</div>${!isCorrect ? `<div class="correct-answer">${escapeHtml(correctLabel)}</div>` : ''}</div>`; 
                }); 
                ansHTML += '</div>'; 
            } 
            item.innerHTML = `<div class="q-text"><b>${i+1}. ${escapeHtml(q.q)}</b></div>${ansHTML}`; 
            reviewList.appendChild(item); 
        }); 
    }

    function renderResults() { 
        const finalScore = TOTAL_POSSIBLE_SCORE > 0 ? Math.round((state.score / TOTAL_POSSIBLE_SCORE) * 100) : 0; 
        if (finalScore >= 50) playSound('success'); 
        else playSound('fail'); 
        finalScoreDisplay.textContent = finalScore; 
        fetchLeaderboard(kelasSelect.value, leaderList, playAgainBtn); 
        if (db) push(ref(db, kelasSelect.value), { name: playerName.value, score: finalScore, photo: lastPhotoBase64 || "", ts: Date.now() }).catch((err) => console.error(err)); 
    }

    function startGlobalTimer() { 
        let timeLeft = 15 * 60; 
        clearInterval(state.timer); 
        globalTimerEl.textContent = "15:00"; // Set initial display
        state.timer = setInterval(() => { 
            timeLeft--; 
            const mins = Math.floor(timeLeft / 60); 
            const secs = timeLeft % 60; 
            globalTimerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`; 
            if (timeLeft <= 0) { 
                clearInterval(state.timer); 
                alert("Waktu habis!"); 
                finishQuiz(); 
            } 
        }, 1000); 
    }
    
    function fetchLeaderboard(nodeName, targetEl, btnToShow = null) { 
        if (btnToShow) btnToShow.style.display = 'none'; 
        targetEl.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>'; 
        if (!db) { 
            targetEl.innerHTML = "<div class='small'>Firebase tidak terkonfigurasi.</div>"; 
            if (btnToShow) btnToShow.style.display = 'block'; 
            return; 
        } 
        const nodeRef = ref(db, nodeName); 
        onValue(nodeRef, (snap) => { 
            const data = snap.val(); 
            if (!data) { 
                targetEl.innerHTML = "<div class='small'>Belum ada skor.</div>"; 
            } else { 
                const arr = Object.values(data).sort((a, b) => b.score - a.score || a.ts - b.ts); 
                targetEl.innerHTML = ""; 
                arr.forEach((it, idx) => { 
                    const el = document.createElement("div"); 
                    el.className = "lbItem"; 
                    el.innerHTML = `<img src="${it.photo}" onerror="this.style.display='none'" /> <div>${idx + 1}. ${escapeHtml(it.name)}</div> <div><b>${it.score}</b></div>`; 
                    targetEl.appendChild(el); 
                }); 
            } 
            if (btnToShow) btnToShow.style.display = 'block'; 
        }, { onlyOnce: true }); 
    }
    
    function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
    
    showScreen("welcome");
});

