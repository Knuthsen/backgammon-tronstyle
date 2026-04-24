// @ts-ignore
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const boardImg = new Image();
boardImg.src = 'TronBoardFAV.jpg';

const GRID = { startX: 1158, gap: 81, barWidth: 66, bottomY: 505, topY: 90, stackOffset: 20, diceYOffset: -130 };
const CHECKER_CONFIG = { radius: 17, cyan: '#00f2ff', magenta: '#ff00ff' };
const OFF_CONFIG = { startX: 1270, magentaY: 640, cyanY: 690, gapX: 40 };

const state = {
  board: Array(24).fill(0),
  dice: [] as number[],
  currentPlayer: 'magenta' as 'cyan' | 'magenta',
  selectedPoint: null as any,
  bar: { cyan: 0, magenta: 0 },
  off: { cyan: 0, magenta: 0 },
  message: "",
  isProcessing: false,
  validTargets: [] as number[]
};

state.board[0] = 2; state.board[11] = 5; state.board[18] = 5; state.board[16] = 3;
state.board[23] = -2; state.board[12] = -5; state.board[5] = -5; state.board[7] = -3;

const animState = {
  checkers: [] as any[],
  dice: [] as any[]
};

const getLogXForPoint = (idx: number) => {
  const isBottom = idx < 12;
  const idxInRow = isBottom ? idx : (23 - idx);
  let x = GRID.startX - (idxInRow * GRID.gap);
  if (idxInRow >= 6) x -= GRID.barWidth;
  return x;
};

const getLogYForPoint = (idx: number, i: number) => {
  return idx < 12 ? GRID.bottomY - (i * GRID.stackOffset) : GRID.topY + (i * GRID.stackOffset);
};

const barCenterX = GRID.startX - (5 * GRID.gap) - (GRID.gap / 2) - (GRID.barWidth / 2);

const getPipCount = (player: 'cyan' | 'magenta') => {
  let pips = state.bar[player] * 25;
  state.board.forEach((n, i) => {
    if (player === 'cyan' && n > 0) pips += n * (24 - i);
    if (player === 'magenta' && n < 0) pips += Math.abs(n) * (i + 1);
  });
  return pips;
};

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

function animateCheckerMove(player: 'cyan' | 'magenta', from: any, to: number) {
  let checker;
  if (from === 'bar') {
    const barCheckers = animState.checkers.filter(c => c.color === CHECKER_CONFIG[player] && c.pointIdx === 'bar');
    checker = player === 'cyan' ? barCheckers.reduce((p, c) => (p.y < c.y ? p : c), barCheckers[0]) : barCheckers.reduce((p, c) => (p.y > c.y ? p : c), barCheckers[0]);
  } else {
    const pts = animState.checkers.filter(c => c.pointIdx === from);
    checker = from < 12 ? pts.reduce((p, c) => (p.y < c.y ? p : c), pts[0]) : pts.reduce((p, c) => (p.y > c.y ? p : c), pts[0]);
  }
  if (!checker) return;
  let tx = getLogXForPoint(to);
  let ty = getLogYForPoint(to, Math.abs(state.board[to]));
  checker.pointIdx = to;
  gsap.to(checker, { x: tx, y: ty, duration: 0.55, ease: "power2.out" });
}

function executeBearOff(from: number, die: number) {
  const p = state.currentPlayer;
  const pts = animState.checkers.filter(c => c.pointIdx === from);
  const checker = from < 12 ? pts.reduce((p, c) => (p.y < c.y ? p : c), pts[0]) : pts.reduce((p, c) => (p.y > c.y ? p : c), pts[0]);
  if (checker) {
    const target = { x: OFF_CONFIG.startX - (state.off[p] * OFF_CONFIG.gapX), y: p === 'magenta' ? OFF_CONFIG.magentaY : OFF_CONFIG.cyanY };
    checker.pointIdx = 'off';
    gsap.to(checker, { x: target.x, y: target.y, duration: 0.72, ease: "back.in(1.2)" });
  }
  state.board[from] -= (p === 'cyan' ? 1 : -1);
  state.off[p]++;
  state.dice.splice(state.dice.indexOf(die), 1);
  animState.dice = animState.dice.filter(d => d.value !== die || d.alpha === 0);
  state.selectedPoint = null;
  if (state.off[p] === 15) { state.message = `${p.toUpperCase()} GEWINNT!`; }
  else if (!state.isProcessing) checkGameState();
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
  let possible = hasBar ? state.dice.some(d => canMove('bar', d)) : state.board.some((c, i) => ((p === 'cyan' && c > 0) || (p === 'magenta' && c < 0)) && state.dice.some(d => canMove(i, d) || canMoveToOff(i, d)));
  if (!possible) {
    state.message = "KEIN ZUG MÖGLICH";
    setTimeout(() => { state.dice = []; animState.dice = []; state.message = ""; state.currentPlayer = p === 'cyan' ? 'magenta' : 'cyan'; if (state.currentPlayer === 'cyan') playAiTurn(); }, 2000);
  }
}

function canMove(from: any, die: number): boolean {
  const isC = state.currentPlayer === 'cyan';
  let to = from === 'bar' ? (isC ? die - 1 : 24 - die) : (isC ? from + die : from - die);
  if (to < 0 || to > 23) return false;
  const tc = state.board[to];
  return !(isC ? tc < -1 : tc > 1);
}

async function playAiTurn() {
  if (state.currentPlayer !== 'cyan' || state.isProcessing) return;
  state.isProcessing = true;
  await new Promise(r => setTimeout(r, 800));
  const r1 = Math.floor(Math.random()*6)+1, r2 = Math.floor(Math.random()*6)+1;
  state.dice = r1 === r2 ? [r1, r1, r1, r1] : [r1, r2];
  animState.dice = state.dice.map((v, i) => ({ value: v, x: barCenterX-22, y: boardImg.height/2 + GRID.diceYOffset + (i*55), alpha: 1, rotation: 0 }));
  await new Promise(r => setTimeout(r, 1200));
  state.isProcessing = false;
  checkGameState();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (boardImg.complete) ctx.drawImage(boardImg, 0, 0);
  animState.checkers.forEach(c => {
    ctx.beginPath(); ctx.arc(c.x, c.y, 17, 0, Math.PI*2);
    ctx.strokeStyle = c.color; ctx.lineWidth = 4; ctx.stroke();
  });
  animState.dice.forEach(d => {
    ctx.fillStyle = "white"; ctx.fillRect(d.x, d.y, 44, 44);
    ctx.fillStyle = "black"; ctx.fillText(d.value.toString(), d.x+22, d.y+22);
  });
  if (state.message) ctx.fillText(state.message, canvas.width/2, 300);
  requestAnimationFrame(render);
}

canvas.addEventListener('mousedown', (e) => {
  if (state.dice.length === 0 && state.currentPlayer === 'magenta') {
     const r1 = Math.floor(Math.random()*6)+1, r2 = Math.floor(Math.random()*6)+1;
     state.dice = r1 === r2 ? [r1, r1, r1, r1] : [r1, r2];
     animState.dice = state.dice.map((v, i) => ({ value: v, x: barCenterX-22, y: 400 + (i*55), alpha: 1, rotation: 0 }));
     checkGameState();
  }
});

boardImg.onload = () => {
  canvas.width = boardImg.width; canvas.height = boardImg.height + 150;
  state.board.forEach((count, idx) => {
    for (let i = 0; i < Math.abs(count); i++) {
      animState.checkers.push({ x: getLogXForPoint(idx), y: getLogYForPoint(idx, i), color: count > 0 ? CHECKER_CONFIG.cyan : CHECKER_CONFIG.magenta, pointIdx: idx });
    }
  });
  render();
};
