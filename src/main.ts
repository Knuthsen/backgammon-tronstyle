// @ts-ignore
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

import './style.css';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const boardImg = new Image();
boardImg.src = '/TronBoardFAV.jpg';
boardImg.onload = () => {
  // 1. Setzt die interne Auflösung auf die Bildgröße
  canvas.width = boardImg.width;
  canvas.height = boardImg.height;
  
  // 2. Falls deine Steine in einer init-Funktion erstellt werden, 
  // muss diese hier aufgerufen werden, damit die Koordinaten stimmen.
  if (typeof initAnimCheckers === "function") {
    initAnimCheckers();
  }
  
  console.log("Board geladen:", canvas.width, "x", canvas.height);
};

// --- KONFIGURATION ---
const GRID = {
  startX: 1158, gap: 81, barWidth: 66,
  bottomY: 505, topY: 90, stackOffset: 20,
  diceYOffset: -130 
};

const CHECKER_CONFIG = {
  radius: 17, lineWidth: 4, coreRadius: 7, glow: 12,
  cyan: '#00f2ff', magenta: '#ff00ff'
};

const OFF_CONFIG = {
  startX: 1270, 
  magentaY: 640, 
  cyanY: 690,
  gapX: 40
};

// --- SPIELZUSTAND ---
const state = {
  board: Array(24).fill(0),
  dice: [] as number[],
  currentPlayer: 'magenta' as 'cyan' | 'magenta',
  selectedPoint: null as number | null | 'bar',
  bar: { cyan: 0, magenta: 0 },
  off: { cyan: 0, magenta: 0 },
  message: "" as string,
  isProcessing: false,
  validTargets: [] as number[]
};

// Startaufstellung
state.board[0] = 2;  state.board[11] = 5; state.board[18] = 5; state.board[16] = 3; 
state.board[23] = -2; state.board[12] = -5; state.board[5] = -5; state.board[7] = -3; 

const animState = {
  checkers: [] as Array<{ id: string; x: number; y: number; color: string; pointIdx: number | 'bar' | 'off' }>,
  dice: [] as Array<{ value: number; x: number; y: number; alpha: number; rotation: number }>
};

// --- HILFSFUNKTIONEN ---
const getLogXForPoint = (idx: number) => {
  const isBottom = idx < 12;
  const idxInRow = isBottom ? idx : (23 - idx);
  let x = GRID.startX - (idxInRow * GRID.gap);
  if (idxInRow >= 6) x -= GRID.barWidth;
  return x;
};

const getLogYForPoint = (idx: number, i: number, count: number) => {
  const isBottom = idx < 12;
  return isBottom ? GRID.bottomY - (i * GRID.stackOffset) : GRID.topY + (i * GRID.stackOffset);
};

const barCenterX = GRID.startX - (5 * GRID.gap) - (GRID.gap / 2) - (GRID.barWidth / 2);

const getLogPosForBar = (player: 'cyan' | 'magenta', i: number) => {
  const boardMid = boardImg.height / 2;
  if (player === 'cyan') {
    return { x: barCenterX, y: boardMid + GRID.diceYOffset - 70 - (i * GRID.stackOffset) };
  } else {
    return { x: barCenterX, y: boardMid + 30 + (i * GRID.stackOffset) };
  }
};

const getOffPos = (player: 'cyan' | 'magenta', index: number) => {
  return {
    x: OFF_CONFIG.startX - (index * OFF_CONFIG.gapX),
    y: player === 'magenta' ? OFF_CONFIG.magentaY : OFF_CONFIG.cyanY
  };
};

const getPipCount = (player: 'cyan' | 'magenta') => {
  let pips = state.bar[player] * 25;
  state.board.forEach((n, i) => {
    if (player === 'cyan' && n > 0) pips += n * (24 - i);
    if (player === 'magenta' && n < 0) pips += Math.abs(n) * (i + 1);
  });
  return pips;
};

// --- LOGIK ---
function canBearOff(player: 'cyan' | 'magenta'): boolean {
  if (state.bar[player] > 0) return false;
  const homeRange = player === 'cyan' ? [18,19,20,21,22,23] : [0,1,2,3,4,5];
  return !state.board.some((c, i) => ((player === 'cyan' && c > 0) || (player === 'magenta' && c < 0)) && !homeRange.includes(i));
}

function canMoveToOff(from: number, die: number): boolean {
  if (!canBearOff(state.currentPlayer)) return false;
  const isCyan = state.currentPlayer === 'cyan';
  const dist = isCyan ? (24 - from) : (from + 1);
  if (die === dist) return true;
  if (die > dist) {
    const further = isCyan ? [18,19,20,21,22,23].filter(p => p < from) : [0,1,2,3,4,5].filter(p => p > from);
    return !further.some(p => (isCyan ? state.board[p] > 0 : state.board[p] < 0));
  }
  return false;
}

function animateCheckerMove(player: 'cyan' | 'magenta', from: number | 'bar', to: number) {
  let checker;
  if (from === 'bar') {
    const barCheckers = animState.checkers.filter(c => c.color === CHECKER_CONFIG[player] && c.pointIdx === 'bar');
    checker = player === 'cyan' ? barCheckers.reduce((p, c) => (p.y < c.y ? p : c), barCheckers[0]) : barCheckers.reduce((p, c) => (p.y > c.y ? p : c), barCheckers[0]);
  } else {
    const pts = animState.checkers.filter(c => c.pointIdx === from);
    checker = from < 12 ? pts.reduce((p, c) => (p.y < c.y ? p : c), pts[0]) : pts.reduce((p, c) => (p.y > c.y ? p : c), pts[0]);
  }
  if (!checker) return;
  let tx, ty;
  if (to === 'bar') {
    const pos = getLogPosForBar(player, state.bar[player]);
    tx = pos.x; ty = pos.y;
  } else {
    tx = getLogXForPoint(to);
    ty = getLogYForPoint(to, Math.abs(state.board[to]), Math.abs(state.board[to]) + 1);
  }
  checker.pointIdx = to;
  gsap.to(checker, { x: tx, y: ty, duration: 0.55, ease: "power2.out" });
}

function animateToOff(player: 'cyan' | 'magenta', from: number) {
  const pts = animState.checkers.filter(c => c.pointIdx === from);
  const checker = from < 12 ? pts.reduce((p, c) => (p.y < c.y ? p : c), pts[0]) : pts.reduce((p, c) => (p.y > c.y ? p : c), pts[0]);
  if (!checker) return;
  const target = getOffPos(player, state.off[player]);
  checker.pointIdx = 'off';
  gsap.to(checker, { x: target.x, y: target.y, duration: 0.72, ease: "back.in(1.2)" });
}

function animateDiceShake() {
  animState.dice = [];
  const boardMid = boardImg.height / 2;
  state.dice.forEach((val, i) => {
    let logX = barCenterX - 22, logY = boardMid + GRID.diceYOffset;
    if (state.dice.length > 2) {
      if (i === 1) logY += 55; else if (i === 2) { logX -= 55; logY += 27; } else if (i === 3) { logX += 55; logY += 27; }
    } else { logY += (i * 55); }
    const die = { value: val, x: logX, y: logY, alpha: 0, rotation: (Math.random() - 0.5) * 90 };
    animState.dice.push(die);
    gsap.to(die, { alpha: 1, rotation: 0, duration: 0.4, ease: "back.out(1.7)", delay: i * 0.1 });
  });
}

function executeBearOff(from: number, die: number) {
  const p = state.currentPlayer;
  animateToOff(p, from);
  state.board[from] -= (p === 'cyan' ? 1 : -1);
  state.off[p]++;
  state.dice.splice(state.dice.indexOf(die), 1);
  const dIdx = animState.dice.findIndex(d => d.value === die && d.alpha === 1);
  if (dIdx !== -1) animState.dice.splice(dIdx, 1);
  state.selectedPoint = null; state.validTargets = [];
  if (state.off[p] === 15) { state.message = `${p.toUpperCase()} GEWINNT!`; return; }
  if (!state.isProcessing) checkGameState();
}

function handleMove(to: number) {
  if (state.selectedPoint === null) {
    if ((state.currentPlayer === 'cyan' ? state.bar.cyan : state.bar.magenta) > 0) return;
    const c = state.board[to];
    if (((state.currentPlayer === 'cyan' && c > 0) || (state.currentPlayer === 'magenta' && c < 0)) && state.dice.length > 0) {
      state.selectedPoint = to; updateValidTargets();
    }
  } else {
    let fromIdx = state.selectedPoint === 'bar' ? (state.currentPlayer === 'cyan' ? -1 : 24) : state.selectedPoint as number;
    const dist = state.currentPlayer === 'cyan' ? (to - fromIdx) : (fromIdx - to);
    const dIdx = state.dice.indexOf(dist);
    if (dIdx !== -1 && canMove(state.selectedPoint, dist)) {
      const s = state.currentPlayer === 'cyan' ? 1 : -1;
      if (state.board[to] === -s) {
        animateCheckerMove(state.currentPlayer === 'cyan' ? 'magenta' : 'cyan', to, 'bar');
        state.board[to] = 0; if (state.currentPlayer === 'cyan') state.bar.magenta++; else state.bar.cyan++;
      }
      animateCheckerMove(state.currentPlayer, state.selectedPoint, to);
      if (state.selectedPoint === 'bar') { if (state.currentPlayer === 'cyan') state.bar.cyan--; else state.bar.magenta--; }
      else { state.board[state.selectedPoint as number] -= s; }
      state.board[to] += s; state.dice.splice(dIdx, 1);
      const adIdx = animState.dice.findIndex(d => d.value === dist && d.alpha === 1);
      if (adIdx !== -1) animState.dice.splice(adIdx, 1);
      state.selectedPoint = null; state.validTargets = [];
      if (!state.isProcessing) checkGameState();
    } else { state.selectedPoint = null; state.validTargets = []; }
  }
}

function canMove(from: number | 'bar', die: number): boolean {
  const isC = state.currentPlayer === 'cyan';
  let to = from === 'bar' ? (isC ? die - 1 : 24 - die) : (isC ? (from as number) + die : (from as number) - die);
  if (to < 0 || to > 23) return false;
  const tc = state.board[to];
  return !(isC ? tc < -1 : tc > 1);
}

function updateValidTargets() {
  state.validTargets = [];
  if (state.selectedPoint === null) return;
  Array.from(new Set(state.dice)).forEach(d => {
    if (canMove(state.selectedPoint!, d)) {
      const isC = state.currentPlayer === 'cyan';
      const to = state.selectedPoint === 'bar' ? (isC ? d - 1 : 24 - d) : (isC ? (state.selectedPoint as number) + d : (state.selectedPoint as number) - d);
      if (!state.validTargets.includes(to)) state.validTargets.push(to);
    }
  });
}

function checkGameState() {
  if (state.isProcessing) return;
  
  const p = state.currentPlayer;
  if (state.dice.length === 0) {
    state.currentPlayer = p === 'cyan' ? 'magenta' : 'cyan';
    if (state.currentPlayer === 'cyan') playAiTurn();
    return;
  }
  
  const hasBar = (p === 'cyan' ? state.bar.cyan : state.bar.magenta) > 0;
  let possible = hasBar 
    ? state.dice.some(d => canMove('bar', d)) 
    : state.board.some((c, i) => ((p === 'cyan' && c > 0) || (p === 'magenta' && c < 0)) && state.dice.some(d => canMove(i, d) || canMoveToOff(i, d)));
  
  if (!possible) {
    state.message = "KEIN ZUG MÖGLICH";
    setTimeout(() => { 
      state.dice = []; 
      animState.dice = []; 
      state.message = ""; 
      state.currentPlayer = p === 'cyan' ? 'magenta' : 'cyan';
      if (state.currentPlayer === 'cyan') playAiTurn();
    }, 2000);
  }
}

// --- KI LOGIK (CYAN) ---
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function evaluateBoard(tempBoard: number[], tempBar: { cyan: number, magenta: number }, tempOff: { cyan: number, magenta: number }): number {
  let score = 0;
  let cyanPips = tempBar.cyan * 25;
  let magPips = tempBar.magenta * 25;
  tempBoard.forEach((n, i) => {
    if (n > 0) cyanPips += n * (24 - i);
    if (n < 0) magPips += Math.abs(n) * (i + 1);
  });
  score += (magPips - cyanPips) * 3;
  tempBoard.forEach((n, i) => {
    if (n >= 2) score += 15;
    if (n === 1) score -= 25;
  });
  score -= tempBar.cyan * 60;
  score += tempBar.magenta * 50;
  score += tempOff.cyan * 100;
  return score;
}

function findBestAiMove() {
  let best = null;
  let maxScore = -Infinity;
  const dice = Array.from(new Set(state.dice));
  const check = (from: number | 'bar', d: number, isOff: boolean) => {
    const b = [...state.board], bar = {...state.bar}, off = {...state.off};
    if (isOff) { b[from as number]--; off.cyan++; }
    else {
      const to = from === 'bar' ? d - 1 : (from as number) + d;
      if (b[to] === -1) { b[to] = 1; bar.magenta++; } else { b[to]++; }
      if (from === 'bar') bar.cyan--; else b[from as number]--;
    }
    const s = evaluateBoard(b, bar, off);
    if (s > maxScore) { maxScore = s; best = { from, die: d, isOff }; }
  };
  if (state.bar.cyan > 0) {
    dice.forEach(d => { if (canMove('bar', d)) check('bar', d, false); });
  } else {
    state.board.forEach((n, i) => {
      if (n > 0) {
        dice.forEach(d => {
          if (canMoveToOff(i, d)) check(i, d, true);
          else if (canMove(i, d)) check(i, d, false);
        });
      }
    });
  }
  return best;
}

async function playAiTurn() {
  if (state.currentPlayer !== 'cyan' || state.isProcessing) return;
  state.isProcessing = true;

  await delay(800);
  const r1 = Math.floor(Math.random()*6)+1, r2 = Math.floor(Math.random()*6)+1;
  // PASCH-LOGIK WIEDER EINGEFÜGT
  state.dice = r1 === r2 ? [r1, r1, r1, r1] : [r1, r2]; 
  animateDiceShake();
  
  await delay(1200); 

  while (state.dice.length > 0) {
    const move = findBestAiMove();
    if (!move) break; 
    
    if (move.isOff) {
      executeBearOff(move.from as number, move.die);
    } else {
      state.selectedPoint = move.from;
      const target = move.from === 'bar' ? move.die - 1 : (move.from as number) + move.die;
      handleMove(target);
    }
    await delay(1000); 
  }

  state.isProcessing = false;
  checkGameState(); // Prüft am Ende, ob noch Würfel übrig sind -> triggert "KEIN ZUG MÖGLICH"
}

// --- RENDERING ---
function drawChecker(x: number, y: number, color: string, isSel: boolean, pulse: boolean, isHigh = false) {
  const p = pulse ? Math.sin(Date.now() * 0.007) * 10 : 0;
  ctx.save();
  if (isHigh) { ctx.shadowBlur = 25; ctx.shadowColor = "#fff"; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3; ctx.setLineDash([5,5]); }
  else { ctx.shadowBlur = isSel ? 35 : 12 + p; ctx.shadowColor = isSel ? "#fff" : color; ctx.strokeStyle = isSel ? "#fff" : color; ctx.lineWidth = isSel ? 6 : 4; }
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
  if (!isHigh) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.strokeStyle = isSel ? '#fff' : color; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (boardImg.complete) ctx.drawImage(boardImg, 0, 0);
  const boardMid = boardImg.height / 2;

  state.validTargets.forEach(idx => {
    const y = idx < 12 ? GRID.bottomY - (Math.abs(state.board[idx]) * GRID.stackOffset) : GRID.topY + (Math.abs(state.board[idx]) * GRID.stackOffset);
    drawChecker(getLogXForPoint(idx), y, "#fff", false, false, true);
  });

  const sorted = [...animState.checkers].sort((a, b) => {
    if (a.y > 600 || b.y > 600) return a.y - b.y;
    return Math.abs(b.y - boardMid) - Math.abs(a.y - boardMid);
  });

  sorted.forEach(c => {
    let isSel = false;
    if (state.selectedPoint === c.pointIdx && c.color === CHECKER_CONFIG[state.currentPlayer]) {
        const pts = sorted.filter(f => f.pointIdx === c.pointIdx && f.color === c.color);
        if (pts[pts.length-1] === c) isSel = true;
    }
    drawChecker(c.x, c.y, c.color, isSel, state.currentPlayer === (c.color === CHECKER_CONFIG.cyan ? 'cyan' : 'magenta') && state.message === "" && c.pointIdx !== 'off');
  });

  ctx.save();
  ctx.font = "bold 15px monospace"; ctx.textAlign = "center"; ctx.shadowBlur = 10;
  ctx.fillStyle = CHECKER_CONFIG.cyan; ctx.shadowColor = CHECKER_CONFIG.cyan;
  ctx.fillText(getPipCount('cyan').toString(), barCenterX, 60);
  ctx.fillStyle = CHECKER_CONFIG.cyan; ctx.shadowColor = CHECKER_CONFIG.cyan;
  ctx.fillText(getPipCount('magenta').toString(), barCenterX, boardImg.height - 225);
  ctx.restore();

  if (state.dice.length === 0 && state.message === "" && state.currentPlayer === 'magenta') {
    const x = barCenterX, y = boardMid + GRID.diceYOffset + 45;
    ctx.save(); ctx.translate(x, y); ctx.shadowBlur = 15; ctx.shadowColor = CHECKER_CONFIG.magenta;
    ctx.strokeStyle = CHECKER_CONFIG.magenta; ctx.lineWidth = 2; ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(20, 0); ctx.lineTo(0, 20); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  animState.dice.forEach(d => {
    ctx.save(); ctx.translate(d.x + 22, d.y + 22); ctx.rotate(d.rotation * Math.PI/180); ctx.translate(-22, -22); ctx.globalAlpha = d.alpha;
    ctx.shadowBlur = 15; ctx.shadowColor = CHECKER_CONFIG[state.currentPlayer]; ctx.strokeStyle = CHECKER_CONFIG[state.currentPlayer]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(0, 0, 44, 44, 8); ctx.stroke(); ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 26px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(d.value.toString(), 22, 24); ctx.restore();
  });

  if (state.message !== "") {
    ctx.save(); const color = CHECKER_CONFIG[state.currentPlayer] || "#fff"; ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(canvas.width/2-190, boardMid+60, 380, 60, 12); ctx.fill(); ctx.stroke();
    ctx.font = "bold 22px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fillText(state.message, canvas.width/2, boardMid+98); ctx.restore();
  }
  requestAnimationFrame(render);
}

// --- INTERAKTION ---
function handleInteraction(clientX: number, clientY: number) {
  if (state.isProcessing || state.currentPlayer === 'cyan') return;
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const boardMid = boardImg.height / 2;

  if (Math.abs(x - barCenterX) < 40 && state.dice.length === 0 && y > boardMid + GRID.diceYOffset && y < boardMid + GRID.diceYOffset + 150) {
    const r1 = Math.floor(Math.random()*6)+1, r2 = Math.floor(Math.random()*6)+1;
    // PASCH-LOGIK WIEDER EINGEFÜGT
    state.dice = r1 === r2 ? [r1, r1, r1, r1] : [r1, r2]; 
    animateDiceShake(); checkGameState(); return;
  }
  
  if (state.dice.length === 0) return;

  if (Math.abs(x - barCenterX) < 40 && state.bar.magenta > 0) {
    state.selectedPoint = state.selectedPoint === 'bar' ? null : 'bar'; updateValidTargets(); return;
  }
  for (let i = 0; i < 24; i++) {
    if (Math.abs(x - getLogXForPoint(i)) < 40) {
      if ((y < boardMid && i >= 12) || (y > boardMid && i < 12)) {
        if (state.selectedPoint === i) {
          const d = state.dice.find(die => canMoveToOff(i, die));
          if (d) { executeBearOff(i, d); return; }
        }
        handleMove(i); break;
      }
    }
  }
}

canvas.addEventListener('mousedown', (e) => handleInteraction(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

// --- INITIALISIERUNG ---
function initAnimCheckers() {
  animState.checkers = [];
  let cT = 0, mT = 0;
  state.board.forEach((count, idx) => {
    const abs = Math.abs(count);
    for (let i = 0; i < abs; i++) {
      animState.checkers.push({
        id: `${count > 0 ? 'c' : 'm'}_${count > 0 ? cT++ : mT++}`,
        x: getLogXForPoint(idx), y: getLogYForPoint(idx, i, abs),
        color: count > 0 ? CHECKER_CONFIG.cyan : CHECKER_CONFIG.magenta, pointIdx: idx
      });
    }
  });
}

function resizeGame() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) return;
  
  // Wir sagen dem Browser, dass das Canvas-Element 
  // optisch den ganzen Platz einnehmen soll
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  
  window.scrollTo(0, 0); // Versteckt die Adressleiste in Safari so gut es geht
}

// Bei jeder Größenänderung oder beim Drehen ausführen
window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', resizeGame);


boardImg.onload = () => { 
  canvas.width = boardImg.width; 
  canvas.height = boardImg.height + 150; 
  resizeGame();
  initAnimCheckers(); 
  render(); 
};
