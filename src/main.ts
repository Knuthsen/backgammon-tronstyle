// @ts-ignore
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import './style.css';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const boardImg = new Image();
boardImg.src = 'TronBoardFAV.jpg';

const GRID = { startX: 1158, gap: 81, barWidth: 66, bottomY: 505, topY: 90, stackOffset: 25, diceYOffset: -130 };
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

const barCenterX = 595; // Manuelle Korrektur für die Mitte

function drawChecker(x: number, y: number, color: string) {
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fill();
  // Innerer Ring
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (boardImg.complete) {
    ctx.drawImage(boardImg, 0, 0);
  }

  animState.checkers.forEach(c => {
    drawChecker(c.x, c.y, c.color);
  });

  animState.dice.forEach(d => {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = state.currentPlayer === 'magenta' ? CHECKER_CONFIG.magenta : CHECKER_CONFIG.cyan;
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.strokeStyle = ctx.shadowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(d.x, d.y, 50, 50, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(d.value.toString(), d.x + 25, d.y + 35);
    ctx.restore();
  });

  if (state.message) {
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(state.message, canvas.width/2, 350);
  }

  requestAnimationFrame(render);
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state.dice.length === 0 && !state.isProcessing) {
    const r1 = Math.floor(Math.random()*6)+1;
    const r2 = Math.floor(Math.random()*6)+1;
    state.dice = [r1, r2];
    animState.dice = [
      { value: r1, x: barCenterX - 60, y: 300 },
      { value: r2, x: barCenterX + 10, y: 300 }
    ];
  }
});

boardImg.onload = () => {
  canvas.width = boardImg.width;
  canvas.height = boardImg.height;
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
