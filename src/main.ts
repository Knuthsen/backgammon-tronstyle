// @ts-ignore
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import './style.css';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const boardImg = new Image();
boardImg.src = 'TronBoardFAV.jpg';

// --- KONFIGURATION ---
const GRID = { 
  startX: 1158, gap: 81, barWidth: 66, 
  bottomY: 505, topY: 90, stackOffset: 22, 
  diceYOffset: -130 
};
const CHECKER_CONFIG = { radius: 17, cyan: '#00f2ff', magenta: '#ff00ff' };

const state = {
  board: Array(24).fill(0),
  dice: [] as number[],
  currentPlayer: 'magenta' as 'cyan' | 'magenta',
  bar: { cyan: 0, magenta: 0 },
  off: { cyan: 0, magenta: 0 },
  message: "",
  isProcessing: false
};

// Startaufstellung
state.board[0] = 2; state.board[11] = 5; state.board[18] = 5; state.board[16] = 3;
state.board[23] = -2; state.board[12] = -5; state.board[5] = -5; state.board[7] = -3;

const animState = { checkers: [] as any[], dice: [] as any[] };

// --- HELFER ---
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

const barCenterX = 595;

const getPipCount = (player: 'cyan' | 'magenta') => {
  let pips = state.bar[player] * 25;
  state.board.forEach((n, i) => {
    if (player === 'cyan' && n > 0) pips += n * (24 - i);
    if (player === 'magenta' && n < 0) pips += Math.abs(n) * (i + 1);
  });
  return pips;
};

// --- ZEICHNEN ---
function drawChecker(x: number, y: number, color: string) {
  ctx.save();
  ctx.shadowBlur = 15; ctx.shadowColor = color;
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (boardImg.complete) ctx.drawImage(boardImg, 0, 0);

  // Pip Counts zeichnen
  ctx.save();
  ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = CHECKER_CONFIG.cyan; ctx.shadowColor = CHECKER_CONFIG.cyan; ctx.shadowBlur = 10;
  ctx.fillText(getPipCount('cyan').toString(), barCenterX, 60);
  ctx.fillStyle = CHECKER_CONFIG.magenta; ctx.shadowColor = CHECKER_CONFIG.magenta;
  ctx.fillText(getPipCount('magenta').toString(), barCenterX, 550);
  ctx.restore();

  // Steine zeichnen
  animState.checkers.forEach(c => drawChecker(c.x, c.y, c.color));

  // Würfel zeichnen (Pasch-optimiert)
  animState.dice.forEach(d => {
    ctx.save();
    ctx.shadowBlur = 15; ctx.shadowColor = CHECKER_CONFIG[state.currentPlayer];
    ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.strokeStyle = ctx.shadowColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(d.x, d.y, 45, 45, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 28px Arial"; ctx.textAlign = "center";
    ctx.fillText(d.value.toString(), d.x + 22, d.y + 33);
    ctx.restore();
  });

  if (state.message) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(canvas.width/2 - 150, 280, 300, 60, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "white"; ctx.font = "bold 22px Arial"; ctx.textAlign = "center";
    ctx.fillText(state.message, canvas.width/2, 318);
    ctx.restore();
  }

  requestAnimationFrame(render);
}

// --- LOGIK ---
async function rollDice() {
  if (state.isProcessing || state.dice.length > 0) return;
  state.isProcessing = true;
  
  const r1 = Math.floor(Math.random() * 6) + 1;
  const r2 = Math.floor(Math.random() * 6) + 1;
  
  // Pasch-Regel: Bei gleichen Zahlen gibt es 4 Züge
  state.dice = r1 === r2 ? [r1, r1, r1, r1] : [r1, r2];
  
  animState.dice = state.dice.map((val, i) => ({
    value: val,
    x: barCenterX - 22,
    y: 180 + (i * 55) // Würfel untereinander stapeln
  }));

  await new Promise(r => setTimeout(r, 600));
  state.isProcessing = false;
  
  // Hier würde die Prüfung auf "KEIN ZUG MÖGLICH" folgen
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state.dice.length === 0) rollDice();
});

boardImg.onload = () => {
  canvas.width = boardImg.width;
  canvas.height = boardImg.height;
  state.board.forEach((count, idx) => {
    for (let i = 0; i < Math.abs(count); i++) {
      animState.checkers.push({ 
        x: getLogXForPoint(idx), y: getLogYForPoint(idx, i), 
        color: count > 0 ? CHECKER_CONFIG.cyan : CHECKER_CONFIG.magenta, 
        pointIdx: idx 
      });
    }
  });
  render();
};
