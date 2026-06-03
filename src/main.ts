// @ts-ignore
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

import './style.css';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const boardImg = new Image();
boardImg.src = 'TronBoardFAV.jpg';

// --- KONFIGURATION ---
const GRID = {
  startX: 1158,
  gap: 81,
  barWidth: 66,
  bottomY: 505,
  topY: 90,
  stackOffset: 20,
  diceYOffset: -130,
};

const CHECKER_CONFIG = {
  radius: 17,
  lineWidth: 4,
  coreRadius: 7,
  glow: 12,
  cyan: '#00f2ff',
  magenta: '#ff00ff',
};

const OFF_CONFIG = {
  startX: 1270,
  magentaY: 640,
  cyanY: 690,
  gapX: 40,
};

// --- SPIELZUSTAND ---
const state = {
  board: Array(24).fill(0),
  dice: [] as number[],
  currentPlayer: 'magenta' as 'cyan' | 'magenta',
  selectedPoint: null as number | null | 'bar',
  bar: { cyan: 0, magenta: 0 },
  off: { cyan: 0, magenta: 0 },
  message: '' as string,
  gameEnded: false,
  isProcessing: false,
  validTargets: [] as number[],
};

// Startaufstellung
state.board[0] = 2;
state.board[11] = 5;
state.board[18] = 5;
state.board[16] = 3;
state.board[23] = -2;
state.board[12] = -5;
state.board[5] = -5;
state.board[7] = -3;

const animState = {
  checkers: [] as Array<{
    id: string;
    x: number;
    y: number;
    color: string;
    pointIdx: number | 'bar' | 'off';
  }>,
  dice: [] as Array<{
    value: number;
    x: number;
    y: number;
    alpha: number;
    rotation: number;
  }>,
};

// --- HILFSFUNKTIONEN ---
const getLogXForPoint = (idx: number) => {
  const isBottom = idx < 12;
  const idxInRow = isBottom ? idx : 23 - idx;
  let x = GRID.startX - idxInRow * GRID.gap;
  if (idxInRow >= 6) x -= GRID.barWidth;
  return x;
};

const getLogYForPoint = (idx: number, i: number, count: number) => {
  const isBottom = idx < 12;
  return isBottom
    ? GRID.bottomY - i * GRID.stackOffset
    : GRID.topY + i * GRID.stackOffset;
};

const barCenterX =
  GRID.startX - 5 * GRID.gap - GRID.gap / 2 - GRID.barWidth / 2;

const getLogPosForBar = (player: 'cyan' | 'magenta', i: number) => {
  const boardMid = boardImg.height / 2;
  if (player === 'cyan') {
    return {
      x: barCenterX,
      y: boardMid + GRID.diceYOffset - 70 - i * GRID.stackOffset,
    };
  } else {
    return { x: barCenterX, y: boardMid + 30 + i * GRID.stackOffset };
  }
};

const getOffPos = (player: 'cyan' | 'magenta', index: number) => {
  return {
    x: OFF_CONFIG.startX - index * OFF_CONFIG.gapX,
    y: player === 'magenta' ? OFF_CONFIG.magentaY : OFF_CONFIG.cyanY,
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
  const homeRange =
    player === 'cyan' ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];
  return !state.board.some(
    (c, i) =>
      ((player === 'cyan' && c > 0) || (player === 'magenta' && c < 0)) &&
      !homeRange.includes(i)
  );
}

function canMoveToOff(from: number, die: number): boolean {
  if (!canBearOff(state.currentPlayer)) return false;
  const isCyan = state.currentPlayer === 'cyan';
  const dist = isCyan ? 24 - from : from + 1;
  if (die === dist) return true;
  if (die > dist) {
    const further = isCyan
      ? [18, 19, 20, 21, 22, 23].filter((p) => p < from)
      : [0, 1, 2, 3, 4, 5].filter((p) => p > from);
    return !further.some((p) =>
      isCyan ? state.board[p] > 0 : state.board[p] < 0
    );
  }
  return false;
}

function animateCheckerMove(
  player: 'cyan' | 'magenta',
  from: number | 'bar',
  to: number
) {
  let checker;
  if (from === 'bar') {
    const barCheckers = animState.checkers.filter(
      (c) => c.color === CHECKER_CONFIG[player] && c.pointIdx === 'bar'
    );
    checker =
      player === 'cyan'
        ? barCheckers.reduce((p, c) => (p.y < c.y ? p : c), barCheckers[0])
        : barCheckers.reduce((p, c) => (p.y > c.y ? p : c), barCheckers[0]);
  } else {
    const pts = animState.checkers.filter((c) => c.pointIdx === from);
    checker =
      from < 12
        ? pts.reduce((p, c) => (p.y < c.y ? p : c), pts[0])
        : pts.reduce((p, c) => (p.y > c.y ? p : c), pts[0]);
  }
  if (!checker) return;
  let tx, ty;
  if (to === 'bar') {
    const pos = getLogPosForBar(player, state.bar[player]);
    tx = pos.x;
    ty = pos.y;
  } else {
    tx = getLogXForPoint(to);
    ty = getLogYForPoint(
      to,
      Math.abs(state.board[to]),
      Math.abs(state.board[to]) + 1
    );
  }
  checker.pointIdx = to;
  gsap.to(checker, { x: tx, y: ty, duration: 0.55, ease: 'power2.out' });
}

function animateToOff(player: 'cyan' | 'magenta', from: number) {
  const pts = animState.checkers.filter((c) => c.pointIdx === from);
  const checker =
    from < 12
      ? pts.reduce((p, c) => (p.y < c.y ? p : c), pts[0])
      : pts.reduce((p, c) => (p.y > c.y ? p : c), pts[0]);
  if (!checker) return;
  const target = getOffPos(player, state.off[player]);
  checker.pointIdx = 'off';
  gsap.to(checker, {
    x: target.x,
    y: target.y,
    duration: 0.72,
    ease: 'back.in(1.2)',
  });
}

function animateDiceShake() {
  animState.dice = [];
  const boardMid = boardImg.height / 2;
  state.dice.forEach((val, i) => {
    let logX = barCenterX - 22,
      logY = boardMid + GRID.diceYOffset;
    if (state.dice.length > 2) {
      if (i === 1) logY += 55;
      else if (i === 2) {
        logX -= 55;
        logY += 27;
      } else if (i === 3) {
        logX += 55;
        logY += 27;
      }
    } else {
      logY += i * 55;
    }
    const die = {
      value: val,
      x: logX,
      y: logY,
      alpha: 0,
      rotation: (Math.random() - 0.5) * 90,
    };
    animState.dice.push(die);
    gsap.to(die, {
      alpha: 1,
      rotation: 0,
      duration: 0.4,
      ease: 'back.out(1.7)',
      delay: i * 0.1,
    });
  });
}

function executeBearOff(from: number, die: number) {
  const p = state.currentPlayer;
  animateToOff(p, from);
  state.board[from] -= p === 'cyan' ? 1 : -1;
  state.off[p]++;
  state.dice.splice(state.dice.indexOf(die), 1);
  const dIdx = animState.dice.findIndex(
    (d) => d.value === die && d.alpha === 1
  );
  if (dIdx !== -1) animState.dice.splice(dIdx, 1);
  state.selectedPoint = null;
  state.validTargets = [];
  if (state.off[p] === 15) {
    const winnerName = p === 'magenta' ? 'PINKY' : 'BRAIN';
    state.message = `${winnerName} HOLT DIE WELTHERRSCHAFT!`;

    // ALLE RESTLICHEN WÜRFEL BEI SIEG ENTFERNEN:
    state.dice = [];
    animState.dice = [];

    state.gameEnded = true; // Sperrt weitere Züge
    return;
  }
  if (!state.isProcessing) checkGameState();
}

function handleMove(to: number) {
  if (state.selectedPoint === null) {
    if (
      (state.currentPlayer === 'cyan' ? state.bar.cyan : state.bar.magenta) > 0
    )
      return;
    const c = state.board[to];
    if (
      ((state.currentPlayer === 'cyan' && c > 0) ||
        (state.currentPlayer === 'magenta' && c < 0)) &&
      state.dice.length > 0
    ) {
      state.selectedPoint = to;
      updateValidTargets();
    }
  } else {
    let fromIdx =
      state.selectedPoint === 'bar'
        ? state.currentPlayer === 'cyan'
          ? -1
          : 24
        : (state.selectedPoint as number);
    const dist = state.currentPlayer === 'cyan' ? to - fromIdx : fromIdx - to;
    const dIdx = state.dice.indexOf(dist);
    if (dIdx !== -1 && canMove(state.selectedPoint, dist)) {
      const s = state.currentPlayer === 'cyan' ? 1 : -1;
      if (state.board[to] === -s) {
        animateCheckerMove(
          state.currentPlayer === 'cyan' ? 'magenta' : 'cyan',
          to,
          'bar'
        );
        state.board[to] = 0;
        if (state.currentPlayer === 'cyan') state.bar.magenta++;
        else state.bar.cyan++;
      }
      animateCheckerMove(state.currentPlayer, state.selectedPoint, to);
      if (state.selectedPoint === 'bar') {
        if (state.currentPlayer === 'cyan') state.bar.cyan--;
        else state.bar.magenta--;
      } else {
        state.board[state.selectedPoint as number] -= s;
      }
      state.board[to] += s;
      state.dice.splice(dIdx, 1);
      const adIdx = animState.dice.findIndex(
        (d) => d.value === dist && d.alpha === 1
      );
      if (adIdx !== -1) animState.dice.splice(adIdx, 1);
      state.selectedPoint = null;
      state.validTargets = [];
      if (!state.isProcessing) checkGameState();
    } else {
      state.selectedPoint = null;
      state.validTargets = [];
    }
  }
}

function canMove(from: number | 'bar', die: number): boolean {
  const isC = state.currentPlayer === 'cyan';
  let to =
    from === 'bar'
      ? isC
        ? die - 1
        : 24 - die
      : isC
      ? (from as number) + die
      : (from as number) - die;
  if (to < 0 || to > 23) return false;
  const tc = state.board[to];
  return !(isC ? tc < -1 : tc > 1);
}

function updateValidTargets() {
  state.validTargets = [];
  if (state.selectedPoint === null) return;
  Array.from(new Set(state.dice)).forEach((d) => {
    if (canMove(state.selectedPoint!, d)) {
      const isC = state.currentPlayer === 'cyan';
      const to =
        state.selectedPoint === 'bar'
          ? isC
            ? d - 1
            : 24 - d
          : isC
          ? (state.selectedPoint as number) + d
          : (state.selectedPoint as number) - d;
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
    ? state.dice.some((d) => canMove('bar', d))
    : state.board.some(
        (c, i) =>
          ((p === 'cyan' && c > 0) || (p === 'magenta' && c < 0)) &&
          state.dice.some((d) => canMove(i, d) || canMoveToOff(i, d))
      );

  if (!possible) {
    state.message = 'KEIN ZUG MÖGLICH';
    setTimeout(() => {
      state.dice = [];
      animState.dice = [];
      state.message = '';
      state.currentPlayer = p === 'cyan' ? 'magenta' : 'cyan';
      if (state.currentPlayer === 'cyan') playAiTurn();
    }, 2000);
  }
}

// --- KI LOGIK (CYAN) ---
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Gibt die Anzahl der Würfelkombinationen (von 36) an, die eine bestimmte Distanz schlagen können
// Berücksichtigt direkte Würfe und Kombinationen (z.B. Distanz 3 geht mit einer 3, aber auch mit 1+2)
const HIT_PROBABILITIES: { [key: number]: number } = {
  1: 11, // Sehr riskant (alle Kombinationen mit einer 1)
  2: 12,
  3: 14,
  4: 15,
  5: 15,
  6: 17, // Die 6 ist am gefährlichsten (Direktschuss + Kombinationen wie 1+5, 2+4, 3+3...)
  7: 6, // Ab hier nur noch Kombinationen aus beiden Würfeln möglich
  8: 6,
  9: 5,
  10: 3,
  11: 2,
  12: 3, // Doppelte 3, Doppelte 4 etc.
};

function getHitDanger(fromIdx: number, tempBoard: number[], tempBarMagenta: number): number {
  let totalDanger = 0;

  // Pinkys Steine auf dem Feld prüfen
  for (let pinkyIdx = fromIdx + 1; pinkyIdx < 24; pinkyIdx++) {
    if (tempBoard[pinkyIdx] < 0) {
      const distance = pinkyIdx - fromIdx;

      if (distance <= 12) {
        let prob = HIT_PROBABILITIES[distance] || 0;

        // Blockaden-Check
        if (distance > 6) {
          for (let checkBlock = pinkyIdx - 1; checkBlock > fromIdx; checkBlock--) {
            if (tempBoard[checkBlock] >= 2) {
              prob *= 0.3; 
              break;
            }
          }
        }
        totalDanger += prob;
      }
    }
  }

  // JETZT RICHTIG: Nutze den simulierten Wert der Bar!
  if (tempBarMagenta > 0) {
    const barDistance = 24 - fromIdx;
    if (barDistance <= 6) {
      totalDanger += HIT_PROBABILITIES[barDistance] || 0;
    }
  }

  // Strategischer Charakter-Shift
  if (fromIdx >= 18) {
    totalDanger *= 2.0; // Höchste Vorsicht im eigenen Heimfeld!
  } else if (fromIdx <= 5) {
    totalDanger *= 0.4; // Mutig in Pinkys Haus agieren
  }

  return totalDanger;
}

// --- PERFIDES EVALUATE BOARD MIT JÄGERMODUS & PRIME-BONUS ---
function evaluateBoard(
  tempBoard: number[],
  tempBar: { cyan: number; magenta: number },
  tempOff: { cyan: number; magenta: number }
): number {
  let score = 0;
  let cyanPips = tempBar.cyan * 25;
  let magPips = tempBar.magenta * 25;

  tempBoard.forEach((n, i) => {
    if (n > 0) cyanPips += n * (24 - i);
    if (n < 0) magPips += Math.abs(n) * (i + 1);
  });

  // 1. Pip-Count (Rennspiel-Aspekt)
  score += (magPips - cyanPips) * 3;

  // 2. Board-Struktur bewerten
  tempBoard.forEach((n, i) => {
    if (n >= 2) {
      if (i >= 18) {
        score += 70; // Von 55 auf 70 erhöht: Blockaden im Heimfeld sind oberste Pflicht!
      } else {
        score += 15;
      }

      // Noch härtere Anti-Tower-Allergie!
      if (n > 3) {
        score -= (n - 3) * 45;
      }
    }

    if (n === 1) {
      // HIER tempBar.magenta übergeben statt dem globalen State!
      const danger = getHitDanger(i, tempBoard, tempBar.magenta);
      if (danger > 0) {
        let penalty = danger * 3.5;
        if (i >= 18) {
          penalty += 15;
        }
        score -= penalty;
      } else {
        score -= 5;
      }
    }
  });

  // Basis-Belohnungen
  score -= tempBar.cyan * 60;
  score += tempBar.magenta * 65;
  score += tempOff.cyan * 100;

  // RE-INTEGRATION: Der erbarmungslose Jagd-Instinkt in Pinkys Festung (0-5)
  for (let i = 0; i <= 5; i++) {
    if (state.board[i] < 0 && tempBoard[i] > state.board[i]) {
      if (tempBoard[i] >= 0) {
        score += 95; // Fette Prämie für das Eliminieren von Pinky in ihrer Heimat!
      }
    }
  }

  // BRANDNEU: Der Prime-Wall-Bonus (Zusammenhängende Blockaden im eigenen Haus)
  // Wenn Brain es schafft, 2, 3 oder mehr Punkte am Stück im Haus zu besetzen,
  // wird Pinky gnadenlos eingemauert.
  let consecutiveBlocks = 0;
  for (let i = 18; i <= 23; i++) {
    if (tempBoard[i] >= 2) {
      consecutiveBlocks++;
    } else {
      if (consecutiveBlocks >= 2) score += consecutiveBlocks * 30;
      consecutiveBlocks = 0;
    }
  }
  if (consecutiveBlocks >= 2) score += consecutiveBlocks * 30;

  return score;
}

// --- INTELLIGENTE LOOK-AHEAD-SUCHE (VOLLSTÄNDIGE ZUGFOLGEN SIMULIEREN) ---
function findBestAiMove() {
  let bestMove = null;
  let maxFinalScore = -Infinity;

  // Rekursive Tiefensuche über alle verfügbaren Würfel-Kombinationen
  function search(
    currentBoard: number[],
    currentBar: { cyan: number; magenta: number },
    currentOff: { cyan: number; magenta: number },
    remainingDice: number[],
    moveHistory: any[]
  ) {
    // Blattschmuck: Keine Würfel mehr übrig -> Endzustand des Zuges bewerten
    if (remainingDice.length === 0) {
      const finalScore = evaluateBoard(currentBoard, currentBar, currentOff);
      if (finalScore > maxFinalScore) {
        maxFinalScore = finalScore;
        bestMove = moveHistory[0] || null; // Wir brauchen den allerersten Teilschritt
      }
      return;
    }

    const uniqueDice = Array.from(new Set(remainingDice));
    let movedAny = false;

    uniqueDice.forEach((d) => {
      const nextDice = [...remainingDice];
      const dieIdx = nextDice.indexOf(d);
      if (dieIdx !== -1) nextDice.splice(dieIdx, 1);

      const executeSimMove = (from: number | 'bar', isOff: boolean) => {
        movedAny = true;
        const nextBoard = [...currentBoard];
        const nextBar = { ...currentBar };
        const nextOff = { ...currentOff };

        if (isOff) {
          nextBoard[from as number]--;
          nextOff.cyan++;
        } else {
          const to = from === 'bar' ? d - 1 : (from as number) + d;
          if (nextBoard[to] === -1) {
            nextBoard[to] = 1;
            nextBar.magenta++;
          } else {
            nextBoard[to]++;
          }
          if (from === 'bar') nextBar.cyan--;
          else nextBoard[from as number]--;
        }

        search(nextBoard, nextBar, nextOff, nextDice, [
          ...moveHistory,
          { from, die: d, isOff },
        ]);
      };

      // REGEL 1: Bar-Zwang beachten
      if (currentBar.cyan > 0) {
        const to = d - 1;
        if (to >= 0 && to <= 23 && currentBoard[to] >= -1) {
          executeSimMove('bar', false);
        }
      } else {
        // REGEL 2: Reguläre Züge & Rausspielen
        let canBearOffNow = true;
        for (let idx = 0; idx < 24; idx++) {
          if (currentBoard[idx] > 0 && idx < 18) {
            canBearOffNow = false;
            break;
          }
        }

        currentBoard.forEach((n, i) => {
          if (n > 0) {
            if (canBearOffNow) {
              const dist = 24 - i;
              let canOff = false;
              if (d === dist) canOff = true;
              else if (d > dist) {
                let hasFurtherBack = false;
                for (let p = 18; p < i; p++) {
                  if (currentBoard[p] > 0) {
                    hasFurtherBack = true;
                    break;
                  }
                }
                if (!hasFurtherBack) canOff = true;
              }
              if (canOff) {
                executeSimMove(i, true);
                return;
              }
            }

            const to = i + d;
            if (to <= 23 && currentBoard[to] >= -1) {
              executeSimMove(i, false);
            }
          }
        });
      }
    });

    // Wenn mit keinem Würfel ein Zug möglich war, bewerten wir das vorzeitige Ende
    if (!movedAny) {
      const finalScore = evaluateBoard(currentBoard, currentBar, currentOff);
      if (finalScore > maxFinalScore) {
        maxFinalScore = finalScore;
        bestMove = moveHistory[0] || null;
      }
    }
  }

  search(state.board, state.bar, state.off, state.dice, []);
  return bestMove;
}

async function playAiTurn() {
  if (state.currentPlayer !== 'cyan' || state.isProcessing) return;
  state.isProcessing = true;

  await delay(800);
  const r1 = Math.floor(Math.random() * 6) + 1,
    r2 = Math.floor(Math.random() * 6) + 1;
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
      const target =
        move.from === 'bar' ? move.die - 1 : (move.from as number) + move.die;
      handleMove(target);
    }
    await delay(1000);
  }

  state.isProcessing = false;
  checkGameState(); // Prüft am Ende, ob noch Würfel übrig sind -> triggert "KEIN ZUG MÖGLICH"
}

// --- RENDERING ---
function drawChecker(
  x: number,
  y: number,
  color: string,
  isSel: boolean,
  pulse: boolean,
  isHigh = false
) {
  const p = pulse ? Math.sin(Date.now() * 0.007) * 10 : 0;
  ctx.save();
  if (isHigh) {
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#fff';
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
  } else {
    ctx.shadowBlur = isSel ? 35 : 12 + p;
    ctx.shadowColor = isSel ? '#fff' : color;
    ctx.strokeStyle = isSel ? '#fff' : color;
    ctx.lineWidth = isSel ? 6 : 4;
  }
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.stroke();
  if (!isHigh) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.strokeStyle = isSel ? '#fff' : color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (boardImg.complete) ctx.drawImage(boardImg, 0, 0);
  const boardMid = boardImg.height / 2;

  state.validTargets.forEach((idx) => {
    const y =
      idx < 12
        ? GRID.bottomY - Math.abs(state.board[idx]) * GRID.stackOffset
        : GRID.topY + Math.abs(state.board[idx]) * GRID.stackOffset;
    drawChecker(getLogXForPoint(idx), y, '#fff', false, false, true);
  });

  const sorted = [...animState.checkers].sort((a, b) => {
    if (a.y > 600 || b.y > 600) return a.y - b.y;
    return Math.abs(b.y - boardMid) - Math.abs(a.y - boardMid);
  });

  sorted.forEach((c) => {
    let isSel = false;
    if (
      state.selectedPoint === c.pointIdx &&
      c.color === CHECKER_CONFIG[state.currentPlayer]
    ) {
      const pts = sorted.filter(
        (f) => f.pointIdx === c.pointIdx && f.color === c.color
      );
      if (pts[pts.length - 1] === c) isSel = true;
    }
    drawChecker(
      c.x,
      c.y,
      c.color,
      isSel,
      state.currentPlayer ===
        (c.color === CHECKER_CONFIG.cyan ? 'cyan' : 'magenta') &&
        state.message === '' &&
        c.pointIdx !== 'off'
    );
  });

  ctx.save();
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 10;
  
  // Cyan Pip-Count
  ctx.fillStyle = CHECKER_CONFIG.cyan;
  ctx.shadowColor = CHECKER_CONFIG.cyan;
  ctx.fillText(getPipCount('cyan').toString(), barCenterX, 60);
  
  // JETZT KORREKT: Magenta Pip-Count in Magenta!
  ctx.fillStyle = CHECKER_CONFIG.magenta;
  ctx.shadowColor = CHECKER_CONFIG.magenta;
  ctx.fillText(
    getPipCount('magenta').toString(),
    barCenterX,
    boardImg.height - 225
  );
  ctx.restore();

  // Nur zeichnen, wenn das Spiel noch läuft
  if (!state.gameEnded) {
    if (
      state.dice.length === 0 &&
      state.message === '' &&
      state.currentPlayer === 'magenta'
    ) {
      const x = barCenterX,
        y = boardMid + GRID.diceYOffset + 45;
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowBlur = 15;
      ctx.shadowColor = CHECKER_CONFIG.magenta;
      ctx.strokeStyle = CHECKER_CONFIG.magenta;
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(20, 0);
      ctx.lineTo(0, 20);
      ctx.lineTo(-20, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // Wenn das Spiel vorbei ist: Zeige "NEUES SPIEL" Button
    const x = barCenterX,
      y = boardMid + GRID.diceYOffset + 45;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.roundRect(x - 70, y - 20, 140, 40, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEUES SPIEL', x, y);
    ctx.restore();
  }

  animState.dice.forEach((d) => {
    ctx.save();
    ctx.translate(d.x + 22, d.y + 22);
    ctx.rotate((d.rotation * Math.PI) / 180);
    ctx.translate(-22, -22);
    ctx.globalAlpha = d.alpha;
    ctx.shadowBlur = 15;
    ctx.shadowColor = CHECKER_CONFIG[state.currentPlayer];
    ctx.strokeStyle = CHECKER_CONFIG[state.currentPlayer];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, 44, 44, 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.value.toString(), 22, 24);
    ctx.restore();
  });

  if (state.message !== '') {
    ctx.save();
    const color = CHECKER_CONFIG[state.currentPlayer] || '#fff';
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Breite von 380 auf 460 erhöht, Startpunkt von -190 auf -230 angepasst:
    ctx.roundRect(canvas.width / 2 - 230, boardMid + 60, 460, 60, 12);
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillText(state.message, canvas.width / 2, boardMid + 98);
    ctx.restore();
  }
  requestAnimationFrame(render);
}

// --- INTERAKTION ---
function handleInteraction(clientX: number, clientY: number) {
  // 1. Koordinaten berechnen (muss immer zuerst passieren)
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const boardMid = boardImg.height / 2;

  // 2. Spezialfall: Spiel beendet (Pinky oder Brain hat gewonnen)
  if (state.gameEnded) {
    const buttonX = barCenterX;
    const buttonY = boardMid + GRID.diceYOffset + 45;

    // Prüfen, ob der Klick innerhalb des "NEUES SPIEL" Buttons liegt
    if (Math.abs(x - buttonX) < 70 && Math.abs(y - buttonY) < 20) {
      location.reload(); // Seite neu laden für ein neues Spiel
    }
    return; // Alle weiteren Interaktionen blockieren, wenn das Spiel vorbei ist
  }

  // 3. Normale Blockaden (KI ist am Zug oder berechnet gerade)
  if (state.isProcessing || state.currentPlayer === 'cyan') return;

  // 4. Würfeln (Nur wenn Pinky keine Würfel mehr hat)
  if (
    Math.abs(x - barCenterX) < 40 &&
    state.dice.length === 0 &&
    y > boardMid + GRID.diceYOffset &&
    y < boardMid + GRID.diceYOffset + 150
  ) {
    const r1 = Math.floor(Math.random() * 6) + 1,
      r2 = Math.floor(Math.random() * 6) + 1;
    // Pasch-Logik: 4 Züge bei gleichen Zahlen
    state.dice = r1 === r2 ? [r1, r1, r1, r1] : [r1, r2];
    animateDiceShake();
    checkGameState();
    return;
  }

  // Wenn keine Würfel da sind, kann man keine Steine bewegen
  if (state.dice.length === 0) return;

  // 5. Interaktion mit der Bar (Steine, die geschlagen wurden)
  if (Math.abs(x - barCenterX) < 40 && state.bar.magenta > 0) {
    state.selectedPoint = state.selectedPoint === 'bar' ? null : 'bar';
    updateValidTargets();
    return;
  }

  // 6. Interaktion mit dem Spielfeld (Steine ziehen)
  for (let i = 0; i < 24; i++) {
    if (Math.abs(x - getLogXForPoint(i)) < 40) {
      // Prüfen, ob oben oder unten geklickt wurde (passend zur Point-Hälfte)
      if ((y < boardMid && i >= 12) || (y > boardMid && i < 12)) {
        if (state.selectedPoint === i) {
          // Falls Stein bereits ausgewählt: Prüfen, ob er rausgespielt werden kann
          const d = state.dice.find((die) => canMoveToOff(i, die));
          if (d) {
            executeBearOff(i, d);
            return;
          }
        }
        // Normalen Zug ausführen
        handleMove(i);
        break;
      }
    }
  }
}

canvas.addEventListener('mousedown', (e) =>
  handleInteraction(e.clientX, e.clientY)
);
canvas.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: false }
);

// --- INITIALISIERUNG ---
function initAnimCheckers() {
  animState.checkers = [];
  let cT = 0,
    mT = 0;
  state.board.forEach((count, idx) => {
    const abs = Math.abs(count);
    for (let i = 0; i < abs; i++) {
      animState.checkers.push({
        id: `${count > 0 ? 'c' : 'm'}_${count > 0 ? cT++ : mT++}`,
        x: getLogXForPoint(idx),
        y: getLogYForPoint(idx, i, abs),
        color: count > 0 ? CHECKER_CONFIG.cyan : CHECKER_CONFIG.magenta,
        pointIdx: idx,
      });
    }
  });
}

function resizeGame() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) return;

  // Nutze die volle Fenstergröße
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';

  // Zwinge das Bild in die Ecken
  canvas.style.objectFit = 'fill';

  window.scrollTo(0, 0);
}

boardImg.onload = () => {
  // ENTFERNE DAS "+ 150" HIER:
  canvas.width = boardImg.width;
  canvas.height = boardImg.height;

  resizeGame();
  initAnimCheckers();
  render();
};
