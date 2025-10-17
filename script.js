
const board = document.getElementById('puzzle-board');
const drawPile = document.getElementById('draw-pile');
const timerDisplay = document.getElementById('timer');
const pauseBtn = document.getElementById('pause-btn');
const rows = 6, cols = 8;
const totalPieces = rows * cols;

let pieces = [], drawStack = [];
let timer = 0, timerInterval = null;
let gameStarted = false;
let paused = false;
let flippedAll = false;

function createPieces() {
  pieces = [];
  for (let i = 1; i <= totalPieces; i++) {
    pieces.push({
      id: i,
      front: `images/piece_${i}.jpg`,
      back: `images/back_piece_${i}.jpg`,
      flipped: false,
      originalIndex: i - 1,
    });
  }
}

function renderPieces() {
  board.innerHTML = '';
  pieces.forEach((piece, index) => {
    const wrapper = createPieceElement(piece, index, false);
    board.appendChild(wrapper);
  });
}

function renderDrawPile() {
  drawPile.innerHTML = '';
  drawStack.forEach((piece, index) => {
    const wrapper = createPieceElement(piece, index, true);
    drawPile.appendChild(wrapper);
  });
}

function createPieceElement(piece, index, fromPile = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'piece' + (piece.flipped ? ' flipped' : '');
  wrapper.setAttribute('draggable', !paused);
  wrapper.dataset.index = index;

  const inner = document.createElement('div');
  inner.className = 'piece-inner';

  const front = document.createElement('div');
  front.className = 'front';
  front.style.backgroundImage = `url(${piece.front})`;

  const back = document.createElement('div');
  back.className = 'back';
  back.style.backgroundImage = `url(${piece.back})`;

  inner.appendChild(front);
  inner.appendChild(back);
  wrapper.appendChild(inner);

  // --- Desktop Flip ---
  wrapper.onclick = () => {
    if (paused) return;
    piece.flipped = !piece.flipped;
    if (fromPile) renderDrawPile(); else renderPieces();
  };

  // --- Touch Handling ---
  let touchStartTime = 0;
  let moved = false;
  let dragInitiated = false;
  let startX = 0, startY = 0;
  let dragTimeoutId = null;
  let touchTarget = null;

  wrapper.addEventListener('touchstart', (e) => {
    if (paused) return;
    touchStartTime = Date.now();
    moved = false;
    dragInitiated = false;
    touchTarget = e.currentTarget;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;

    // Only create clone after movement or long-press
    dragTimeoutId = setTimeout(() => {
      if (!dragInitiated) {
        startDragFromTouch(touchTarget, startX, startY, piece, fromPile);
        dragInitiated = true;
      }
    }, 300);

    if (!gameStarted) startTimer();
    e.preventDefault();
  }, { passive: false });

  wrapper.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - startX);
    const dy = Math.abs(t.clientY - startY);

    if (!dragInitiated && (dx > 10 || dy > 10)) {
      if (dragTimeoutId) clearTimeout(dragTimeoutId);
      startDragFromTouch(touchTarget, t.clientX, t.clientY, piece, fromPile);
      dragInitiated = true;
    }
    moved = true;

    if (dragInitiated && touchClone) {
      touchClone.style.left = (t.clientX - touchClone.offsetWidth / 2) + 'px';
      touchClone.style.top = (t.clientY - touchClone.offsetHeight / 2) + 'px';
    }
    e.preventDefault();
  }, { passive: false });

  wrapper.addEventListener('touchend', (e) => {
    if (dragTimeoutId) clearTimeout(dragTimeoutId);
    const tapDuration = Date.now() - touchStartTime;

    if (!dragInitiated && !moved && tapDuration < 250) {
      // Flip only
      if (paused) return;
      piece.flipped = !piece.flipped;
      if (fromPile) renderDrawPile(); else renderPieces();
      e.preventDefault();
      return;
    }

    if (dragInitiated) {
      handleTouchDrop(e.changedTouches[0]);
    }

    if (touchClone && document.body.contains(touchClone)) {
      document.body.removeChild(touchClone);
    }
    touchClone = null;
    touchPiece = null;
    touchFromPile = false;
    e.preventDefault();
  }, { passive: false });

  // --- Desktop Drag ---
  wrapper.ondragstart = (e) => {
    if (paused) { e.preventDefault(); return; }
    if (!gameStarted) startTimer();
    e.dataTransfer.setData('pieceId', piece.id);
    e.dataTransfer.setData('fromPile', fromPile);
    const dragImg = new Image();
    dragImg.src = piece.front;
    e.dataTransfer.setDragImage(dragImg, 45, 45);
    e.dataTransfer.effectAllowed = "move";
  };

  wrapper.ondragover = (e) => e.preventDefault();
  wrapper.ondrop = (e) => {
    if (paused) return;
    e.preventDefault();
    const pieceId = parseInt(e.dataTransfer.getData('pieceId'));
    const fromPileDrop = e.dataTransfer.getData('fromPile') === 'true';
    const toIndex = parseInt(wrapper.dataset.index);

    if (fromPileDrop) {
      const droppedIdx = drawStack.findIndex(p => p.id === pieceId);
      if (droppedIdx !== -1) {
        const droppedPiece = drawStack[droppedIdx];
        pieces.splice(toIndex, 0, droppedPiece);
        drawStack.splice(droppedIdx, 1);
      }
    } else {
      const fromIndex = pieces.findIndex(p => p.id === pieceId);
      if (fromIndex !== -1) {
        [pieces[fromIndex], pieces[toIndex]] = [pieces[toIndex], pieces[fromIndex]];
      }
    }

    renderPieces();
    renderDrawPile();
  };

  return wrapper;
}

// --- Game Functions ---
function drawNextPiece() {
  if (paused) return;
  if (drawStack.length > 0) {
    const nextPiece = drawStack.shift();
    pieces.push(nextPiece);
    renderPieces();
    renderDrawPile();
    if (!gameStarted) startTimer();
  }
}

function solvePuzzle() {
  pieces = [...pieces, ...drawStack];
  drawStack = [];
  pieces.sort((a, b) => a.originalIndex - b.originalIndex);
  pieces.forEach(p => p.flipped = false);
  renderPieces();
  renderDrawPile();
}

function resetPuzzle() {
  createPieces();
  const all = shuffleArray(pieces);
  pieces = all.slice(0, 3);
  drawStack = all.slice(3);
  renderPieces();
  renderDrawPile();
  resetTimer();
  gameStarted = false;
  flippedAll = false;
}

function flipPuzzle() {
  flippedAll = !flippedAll;
  if (flippedAll) {
    let flippedArray = [];
    for (let r = 0; r < rows; r++) {
      const start = r * cols;
      const row = pieces.slice(start, start + cols).reverse();
      flippedArray = flippedArray.concat(row);
    }
    pieces = flippedArray.map(p => ({ ...p, flipped: true }));
  } else {
    pieces.sort((a, b) => a.originalIndex - b.originalIndex);
    pieces.forEach(p => p.flipped = false);
  }
  renderPieces();
  renderDrawPile();
}

function shuffleArray(arr) {
  return arr.map(v => ({ v, s: Math.random() })).sort((a,b)=>a.s-b.s).map(o=>o.v);
}

function startTimer() {
  if (timerInterval) return;
  gameStarted = true;
  timerInterval = setInterval(()=>{timer++;updateTimer();},1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval=null;timer=0;updateTimer();
}

function updateTimer() { timerDisplay.textContent=`Time: ${timer}s`; }

function togglePause() {
  paused=!paused;
  if(paused){
    clearInterval(timerInterval);
    timerInterval=null;
    board.classList.add('paused');
    drawPile.classList.add('paused');
    pauseBtn.textContent="Play";
  }else{
    startTimer();
    board.classList.remove('paused');
    drawPile.classList.remove('paused');
    pauseBtn.textContent="Pause";
  }
}

// --- Touch Drag Helpers ---
let touchClone = null;
let touchPiece = null;
let touchFromPile = false;

function startDragFromTouch(targetElem, clientX, clientY, piece, fromPile) {
  touchPiece = piece;
  touchFromPile = fromPile;
  touchClone = targetElem.cloneNode(true);
  touchClone.style.position = "fixed";
  touchClone.style.left = (clientX - targetElem.offsetWidth / 2) + "px";
  touchClone.style.top = (clientY - targetElem.offsetHeight / 2) + "px";
  touchClone.style.width = targetElem.offsetWidth + "px";
  touchClone.style.height = targetElem.offsetHeight + "px";
  touchClone.style.pointerEvents = "none";
  touchClone.style.zIndex = "10000";
  touchClone.style.opacity = "0.95";
  document.body.appendChild(touchClone);
}

function handleTouchDrop(touchPoint) {
  const dropTarget = document.elementFromPoint(touchPoint.clientX, touchPoint.clientY);
  const dropWrapper = dropTarget?.closest('.piece');
  if (dropWrapper) {
    const toIndex = parseInt(dropWrapper.dataset.index);
    if (touchFromPile) {
      const droppedIdx = drawStack.findIndex(p => p.id === touchPiece.id);
      if (droppedIdx !== -1) {
        const droppedPiece = drawStack[droppedIdx];
        pieces.splice(toIndex, 0, droppedPiece);
        drawStack.splice(droppedIdx, 1);
      }
    } else {
      const fromIndex = pieces.findIndex(p => p.id === touchPiece.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        [pieces[fromIndex], pieces[toIndex]] = [pieces[toIndex], pieces[fromIndex]];
      }
    }
    renderPieces();
    renderDrawPile();
  }
}

createPieces();
resetPuzzle();
