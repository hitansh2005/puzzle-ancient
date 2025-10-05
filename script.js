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

  wrapper.onclick = () => {
    if (paused) return;
    piece.flipped = !piece.flipped;
    if (fromPile) renderDrawPile(); else renderPieces();
  };

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
      const row = pieces.slice(start, start + cols).reverse(); // right-to-left order
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

createPieces();
resetPuzzle();
