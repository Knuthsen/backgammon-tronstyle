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

// Startaufstellung
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

function animateCheckerMove(player: 'cyan' | 'magenta', from: any, to: number) {
  let checker;
  const colorKey = player === 'cyan' ? CHECKER_CONFIG.cyan : CHECKER_CONFIG.magenta;
  
  if (from === 'bar') {
    const barCheckers = animState.checkers.filter(c => c.color === colorKey && c.pointIdx === 'bar');
    if (barCheckers.length === 0) return;
    checker = player === 'cyan' ? barCheckers.reduce((p, c) => (p.y < c.y ? p : c)) : barCheckers.reduce((p, c) => (p.y > c.y ? p : c));
  } else {
    const pts = animState.checkers.filter(c => c.pointIdx === Number(from));
    if (pts.length === 0) return;
    checker = Number(from) < 12 ? pts.reduce((p, c) => (p.y < c.y ? p : c)) : pts.reduce((p, c) => (p.y > c.y ? p : c));
  }
  
  if (!checker) return;
  const tx = getLogXForPoint(to);
  const ty = getLogYForPoint(to, Math.abs(state.board[to]));
  checker.pointIdx = to;
  gsap.to(checker, { x: tx, y: ty, duration: 0.55, ease: "power2.out" });
}

async function playAiTurn() {
  if (state.currentPlayer !== 'cyan' || state.isProcessing) return;
  state.isProcessing = true;
  await new Promise(r => setTimeout(r, 800));
  const r1 = Math.floor(Math.random()*6)+1, r2 = Math.floor(Math.random()*6)+1;
  state.dice = r1 === r2 ? [r1, r1, r1, r1] : [r1, r2];
  
  const midY = boardImg.height / 2;
  animState.dice = state.dice.map((v, i) => ({ 
    value: v, x: barCenterX - 22, y: midY + GRID.diceYOffset + (i * 55), alpha: 1, rotation: 0 
  }));
  
  await new Promise(r => setTimeout(r, 1200));
  state.isProcessing = false;
  // Hier würde die Logik weitergehen
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (boardImg.complete) ctx.drawImage(boardImg, 0, 0);
  
  animState.checkers.forEach(c => {
    ctx.beginPath(); ctx.arc(c.x, c.y, 17, 0, Math.PI * 2);
    ctx.strokeStyle = c.color; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fill();
  });
  
  animState.dice.forEach(d => {
    ctx.fillStyle = "white"; ctx.fillRect(d.x, d.y, 44, 44);
    ctx.fillStyle = "black"; ctx.font = "20px Arial"; ctx.textAlign = "center";
    ctx.fillText(d.value.toString(), d.x + 22, d.y + 28);
  });
  
  requestAnimationFrame(render);
}

boardImg.onload = () => {
  canvas.width = boardImg.width; canvas.height = boardImg.height + 150;
  state.board.forEach((count, idx) => {
    for (let i = 0; i < Math.abs(count); i++) {
      animState.checkers.push({ 
        x: getLogXForPoint(idx), 
        y: getLogYForPoint(idx, i), 
        color: count > 0 ? CHECKER_CONFIG.cyan : CHECKER_CONFIG.magenta, 
        pointIdx: idx 
      });
    }
  });
  render();
};
