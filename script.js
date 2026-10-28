const ROWS = 6;
const COLS = 7;
const HUMAN = 1;
const AI = 2;
const WIN_SCORE = 1000000;

let board = createBoard();
let currentPlayer = HUMAN;
let gameOver = false;
let moveLog = [];
let winningCells = [];
let scores = { human: 0, ai: 0, draws: 0 };
let lastAiScore = null;

const boardEl = document.getElementById("board");
const controlsEl = document.getElementById("columnControls");

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function legalColumns(position = board) {
  const columns = [];
  for (let c = 0; c < COLS; c++) {
    if (position[0][c] === 0) columns.push(c);
  }
  return columns;
}

function getOpenRow(position, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (position[r][col] === 0) return r;
  }
  return -1;
}

function dropDisc(position, col, player) {
  const row = getOpenRow(position, col);
  if (row !== -1) position[row][col] = player;
  return row;
}

function undoDisc(position, row, col) {
  position[row][col] = 0;
}

function winningLine(position, player) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (position[r][c] !== player) continue;
      for (const [dr, dc] of directions) {
        const cells = [];
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || position[rr][cc] !== player) break;
          cells.push([rr, cc]);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return null;
}

function countImmediateWins(position, player) {
  let count = 0;
  for (const col of legalColumns(position)) {
    const row = dropDisc(position, col, player);
    const won = Boolean(winningLine(position, player));
    undoDisc(position, row, col);
    if (won) count++;
  }
  return count;
}

function scoreWindow(window, player) {
  const opponent = player === AI ? HUMAN : AI;
  const own = window.filter(v => v === player).length;
  const theirs = window.filter(v => v === opponent).length;
  const empty = window.filter(v => v === 0).length;

  if (own === 4) return 100000;
  if (own === 3 && empty === 1) return 120;
  if (own === 2 && empty === 2) return 18;
  if (own === 1 && empty === 3) return 2;
  if (theirs === 3 && empty === 1) return -150;
  if (theirs === 2 && empty === 2) return -12;
  return 0;
}

function scorePosition(position, player = AI) {
  let score = 0;

  // Center control creates more possible four-in-a-row combinations.
  const centerCol = Math.floor(COLS / 2);
  for (let r = 0; r < ROWS; r++) {
    if (position[r][centerCol] === player) score += 7;
  }

  // Score every group of four horizontally, vertically, and diagonally.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS) {
        score += scoreWindow([position[r][c], position[r][c+1], position[r][c+2], position[r][c+3]], player);
      }
      if (r + 3 < ROWS) {
        score += scoreWindow([position[r][c], position[r+1][c], position[r+2][c], position[r+3][c]], player);
      }
      if (r + 3 < ROWS && c + 3 < COLS) {
        score += scoreWindow([position[r][c], position[r+1][c+1], position[r+2][c+2], position[r+3][c+3]], player);
      }
      if (r + 3 < ROWS && c - 3 >= 0) {
        score += scoreWindow([position[r][c], position[r+1][c-1], position[r+2][c-2], position[r+3][c-3]], player);
      }
    }
  }
  return score;
}

function evaluateMove(col) {
  const row = dropDisc(board, col, AI);
  if (row === -1) return { col, score: -Infinity, reason: "Column is full." };

  if (winningLine(board, AI)) {
    undoDisc(board, row, col);
    return { col, score: WIN_SCORE, reason: "Winning move: this column connects four AI discs." };
  }

  // A large penalty is applied if the move leaves any immediate human win.
  const humanWinningReplies = countImmediateWins(board, HUMAN);
  let score = scorePosition(board, AI);
  let reason = "Improves AI patterns and center control.";

  if (humanWinningReplies > 0) {
    score -= 250000 * humanWinningReplies;
    reason = `Safety warning: this move leaves ${humanWinningReplies} immediate opponent winning option${humanWinningReplies > 1 ? "s" : ""}.`;
  } else {
    // If the opponent has an immediate win before our move, occupying its column is a block.
    // Test by considering the current position with the human to move.
    const threatCountBefore = countImmediateWins(board, HUMAN);
    if (threatCountBefore === 0) reason = explainPattern(board, col, score);
  }

  undoDisc(board, row, col);
  return { col, score, reason };
}

function explainPattern(position, col, score) {
  const centerDistance = Math.abs(3 - col);
  if (col === 3) return "Center control: the middle column participates in the most potential winning lines.";
  if (score > 100) return "Pattern building: this move strengthens a promising group of AI discs.";
  if (centerDistance === 1) return "Strategic positioning: this move stays close to the center and preserves several attack routes.";
  return "Best available heuristic score: this move balances patterns, safety, and board position.";
}

function chooseAiMove() {
  const legal = legalColumns(board);
  if (!legal.length) return null;

  // First, take a winning move if one exists.
  for (const col of legal) {
    const row = dropDisc(board, col, AI);
    const wins = Boolean(winningLine(board, AI));
    undoDisc(board, row, col);
    if (wins) return { col, score: WIN_SCORE, reason: "Winning move found: four AI discs will connect." };
  }

  // Next, block any immediate winning move available to the human.
  for (const col of legal) {
    const row = dropDisc(board, col, HUMAN);
    const blocksThreat = Boolean(winningLine(board, HUMAN));
    undoDisc(board, row, col);
    if (blocksThreat) {
      return { col, score: 500000, reason: "Threat blocked: this column prevents your immediate four-in-a-row win." };
    }
  }

  // Otherwise, score every legal move using the heuristic evaluation function.
  const candidates = legal.map(evaluateMove);
  candidates.sort((a, b) => b.score - a.score);
  const bestScore = candidates[0].score;
  const best = candidates.filter(m => m.score === bestScore);
  return best[Math.floor(Math.random() * best.length)];
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
      const disc = document.createElement("div");
      disc.className = "disc";
      if (board[r][c] === HUMAN) disc.classList.add("red");
      if (board[r][c] === AI) disc.classList.add("yellow");
      if (winningCells.some(([wr, wc]) => wr === r && wc === c)) disc.classList.add("winning");
      cell.appendChild(disc);
      boardEl.appendChild(cell);
    }
  }

  controlsEl.innerHTML = "";
  for (let c = 0; c < COLS; c++) {
    const button = document.createElement("button");
    button.className = "column-button";
    button.textContent = `↓ ${c + 1}`;
    button.disabled = gameOver || currentPlayer !== HUMAN || board[0][c] !== 0;
    button.title = `Drop a red disc in column ${c + 1}`;
    button.addEventListener("click", () => humanMove(c));
    controlsEl.appendChild(button);
  }
  document.getElementById("moveCount").textContent = `${moveLog.length} move${moveLog.length === 1 ? "" : "s"}`;
  document.getElementById("historyCount").textContent = moveLog.length;
  renderHistory();
  updateTurn();
}

function renderHistory() {
  const list = document.getElementById("moveHistory");
  list.innerHTML = "";
  if (!moveLog.length) {
    const empty = document.createElement("li");
    empty.className = "empty-history";
    empty.textContent = "Moves will appear here.";
    list.appendChild(empty);
    return;
  }
  moveLog.slice().reverse().forEach((move, i) => {
    const item = document.createElement("li");
    const chip = document.createElement("span");
    chip.className = `history-chip ${move.player === HUMAN ? "red" : "yellow"}`;
    chip.textContent = move.player === HUMAN ? "R" : "Y";
    const label = document.createElement("span");
    label.textContent = `${move.player === HUMAN ? "You" : "AI"} · Column ${move.col + 1}`;
    const detail = document.createElement("span");
    detail.className = "history-detail";
    detail.textContent = `#${moveLog.length - i}`;
    item.append(chip, label, detail);
    list.appendChild(item);
  });
}

function updateTurn() {
  const icon = document.getElementById("turnIcon");
  const label = document.getElementById("turnLabel");
  const player = document.getElementById("turnPlayer");
  if (gameOver) {
    icon.textContent = "✓";
    icon.style.color = "var(--green)";
    label.textContent = "MATCH COMPLETE";
    player.textContent = "Start a new game";
  } else if (currentPlayer === HUMAN) {
    icon.textContent = "●";
    icon.style.color = "var(--red)";
    label.textContent = "YOUR TURN";
    player.textContent = "Red player";
  } else {
    icon.textContent = "●";
    icon.style.color = "var(--yellow)";
    label.textContent = "AI THINKING";
    player.textContent = "Yellow player";
  }
}

function humanMove(col) {
  if (gameOver || currentPlayer !== HUMAN || board[0][col] !== 0) return;
  const row = dropDisc(board, col, HUMAN);
  if (row === -1) return;
  moveLog.push({ player: HUMAN, col, row });
  const win = winningLine(board, HUMAN);
  if (win) {
    winningCells = win;
    gameOver = true;
    scores.human++;
    document.getElementById("aiReason").textContent = "You connected four. The match is yours — start a new game to challenge the heuristic AI again.";
    updateScores();
    renderBoard();
    return;
  }
  if (!legalColumns(board).length) {
    finishDraw();
    return;
  }
  currentPlayer = AI;
  renderBoard();
  document.getElementById("aiReason").textContent = "Evaluating legal moves, checking immediate threats, and comparing heuristic scores…";
  window.setTimeout(runAiTurn, 350);
}

function runAiTurn() {
  if (gameOver) return;
  const choice = chooseAiMove();
  if (!choice) {
    finishDraw();
    return;
  }
  const row = dropDisc(board, choice.col, AI);
  moveLog.push({ player: AI, col: choice.col, row, score: choice.score });
  lastAiScore = choice.score;
  document.getElementById("lastMove").textContent = `Column ${choice.col + 1}`;
  document.getElementById("lastScore").textContent = Number.isFinite(choice.score) ? choice.score.toLocaleString() : "—";
  document.getElementById("aiReason").textContent = choice.reason;

  const win = winningLine(board, AI);
  if (win) {
    winningCells = win;
    gameOver = true;
    scores.ai++;
    document.getElementById("aiReason").textContent = "Winning move: the AI connected four discs. The heuristic prioritized the immediate win.";
    updateScores();
  } else if (!legalColumns(board).length) {
    finishDraw();
    return;
  } else {
    currentPlayer = HUMAN;
  }
  renderBoard();
}

function finishDraw() {
  gameOver = true;
  scores.draws++;
  document.getElementById("aiReason").textContent = "The board is full and neither player connected four. This match is a draw.";
  updateScores();
  renderBoard();
}

function updateScores() {
  document.getElementById("humanScore").textContent = scores.human;
  document.getElementById("aiScore").textContent = scores.ai;
  document.getElementById("drawScore").textContent = scores.draws;
}

function newGame() {
  board = createBoard();
  currentPlayer = HUMAN;
  gameOver = false;
  moveLog = [];
  winningCells = [];
  lastAiScore = null;
  document.getElementById("lastMove").textContent = "—";
  document.getElementById("lastScore").textContent = "—";
  document.getElementById("aiReason").textContent = "I will evaluate legal columns, look for immediate wins, block immediate threats, and score promising patterns.";
  renderBoard();
}

function undoTurn() {
  if (!moveLog.length) return;
  if (gameOver) gameOver = false;
  // Undo the last human move and the AI response, if present.
  let removed = 0;
  while (moveLog.length && removed < 2) {
    const move = moveLog.pop();
    board[move.row][move.col] = 0;
    removed++;
    if (move.player === HUMAN && removed >= 1) break;
  }
  winningCells = [];
  currentPlayer = HUMAN;
  document.getElementById("lastMove").textContent = "—";
  document.getElementById("lastScore").textContent = "—";
  document.getElementById("aiReason").textContent = "Last turn undone. Choose a column to continue.";
  renderBoard();
}

document.getElementById("newGameBtn").addEventListener("click", newGame);
document.getElementById("undoBtn").addEventListener("click", undoTurn);
renderBoard();
