const canvas = document.querySelector("#battlefield");
const ctx = canvas.getContext("2d");
const formulaInput = document.querySelector("#formula");
const fireBtn = document.querySelector("#fireBtn");
const previewBtn = document.querySelector("#previewBtn");
const resetBtn = document.querySelector("#resetBtn");
const startBtn = document.querySelector("#startBtn");
const leftBtn = document.querySelector("#leftBtn");
const rightBtn = document.querySelector("#rightBtn");
const moveLeftBtn = document.querySelector("#moveLeftBtn");
const moveRightBtn = document.querySelector("#moveRightBtn");
const moveSlider = document.querySelector("#moveSlider");
const moveHint = document.querySelector("#moveHint");
const teamsEl = document.querySelector("#teams");
const turnName = document.querySelector("#turnName");
const turnTimer = document.querySelector("#turnTimer");
const currentTitle = document.querySelector("#currentTitle");
const currentBadge = document.querySelector("#currentBadge");
const toast = document.querySelector("#toast");
const resultsPanel = document.querySelector("#resultsPanel");
const rankingList = document.querySelector("#rankingList");
const closeResultsBtn = document.querySelector("#closeResultsBtn");

const colors = ["#d84c3f", "#2478d4", "#1c9a5b", "#c18718", "#8060cf"];
const MAX_TAN_VALUE = 1200;
const MAX_PREVIEWS = 2;
const COORD_UNIT = 50;
const GRID_UNIT = Math.PI;
const ORIGIN_EPSILON = 0.001;
const TURN_SECONDS = 180;
const initialTanks = [
  { name: "1모둠", x: -430, hp: 100, color: colors[0], lastTrigType: "" },
  { name: "2모둠", x: -210, hp: 100, color: colors[1], lastTrigType: "" },
  { name: "3모둠", x: 0, hp: 100, color: colors[2], lastTrigType: "" },
  { name: "4모둠", x: 230, hp: 100, color: colors[3], lastTrigType: "" },
  { name: "5모둠", x: 455, hp: 100, color: colors[4], lastTrigType: "" },
];

let tanks = structuredClone(initialTanks);
let current = 0;
let direction = 1;
let previewPath = [];
let missile = null;
let explosions = [];
let animating = false;
let lastTime = 0;
let messageTimer = 0;
let turnPreviewCount = 0;
let turnSecondsLeft = TURN_SECONDS;
let turnTimerId = 0;
let gameStarted = false;
let camera = { x: 0, y: 0 };
let dragState = null;
let eliminationOrder = [];
let craters = [];
let turnStartX = initialTanks[0].x;

function terrainY(x) {
  const base = 46 * Math.sin(x / 86) + 28 * Math.sin((x + 120) / 150) + 13 * Math.cos(x / 38);
  return craters.reduce((height, crater) => {
    const distance = x - crater.x;
    const influence = Math.exp(-(distance * distance) / (2 * crater.radius * crater.radius));
    return height - crater.depth * influence;
  }, base);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function beginDrag(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const point = canvasPoint(event);
  const scale = worldToScreen(0, 0).scale;
  dragState = {
    x: point.x,
    y: point.y,
    cameraX: camera.x,
    cameraY: camera.y,
    scale,
  };
  canvas.classList.add("dragging");
  canvas.setPointerCapture?.(event.pointerId);
}

function moveDrag(event) {
  if (!dragState) return;
  const point = canvasPoint(event);
  const dx = point.x - dragState.x;
  const dy = point.y - dragState.y;
  camera.x = dragState.cameraX - dx / dragState.scale;
  camera.y = dragState.cameraY + dy / dragState.scale;
  draw();
}

function endDrag(event) {
  if (!dragState) return;
  dragState = null;
  canvas.classList.remove("dragging");
  canvas.releasePointerCapture?.(event.pointerId);
}

function liveTanks() {
  return tanks.filter((tank) => tank.hp > 0);
}

function currentTank() {
  return tanks[current];
}

function nextTurn() {
  if (liveTanks().length <= 1) return;
  do {
    current = (current + 1) % tanks.length;
  } while (tanks[current].hp <= 0);
  previewPath = [];
  turnPreviewCount = 0;
  turnStartX = currentTank().x;
  updateMoveControls();
  resetCamera();
  resetTurnTimer();
  updateUi();
  draw();
}

function resetCamera() {
  camera = { x: 0, y: 0 };
}

function resetTurnTimer() {
  turnSecondsLeft = TURN_SECONDS;
  updateTimerUi();
}

function updateTimerUi() {
  const minutes = Math.floor(turnSecondsLeft / 60);
  const seconds = String(turnSecondsLeft % 60).padStart(2, "0");
  turnTimer.textContent = `${minutes}:${seconds}`;
  turnTimer.classList.toggle("warning", turnSecondsLeft <= 30);
  const activeMeta = document.querySelector(".team.active .preview-used");
  if (activeMeta) {
    activeMeta.textContent = `턴 · 미리보기 ${turnPreviewCount}/${MAX_PREVIEWS} · 남은 시간 ${turnTimer.textContent}`;
  }
}

function startTurnClock() {
  clearInterval(turnTimerId);
  resetTurnTimer();
  turnTimerId = setInterval(() => {
    if (!gameStarted || animating || liveTanks().length <= 1) return;
    turnSecondsLeft = Math.max(0, turnSecondsLeft - 1);
    updateTimerUi();
    if (turnSecondsLeft === 0) {
      showToast(`${currentTank().name}의 제한시간이 끝나 다음 턴으로 넘어갑니다.`);
      nextTurn();
    }
  }, 1000);
}

function startGame() {
  gameStarted = true;
  startBtn.disabled = true;
  startBtn.textContent = "진행 중";
  turnPreviewCount = 0;
  turnStartX = currentTank().x;
  updateMoveControls();
  startTurnClock();
  updateUi();
  draw();
  showToast("게임을 시작했어요. 제한시간이 흐르기 시작합니다.");
}

function setDirection(next) {
  direction = next;
  leftBtn.classList.toggle("selected", direction === -1);
  rightBtn.classList.toggle("selected", direction === 1);
  previewPath = [];
  draw();
}

function updateMoveControls() {
  const offset = (currentTank().x - turnStartX) / COORD_UNIT;
  moveSlider.value = String(Math.max(-1, Math.min(1, offset)));
  moveHint.textContent = `이동: ${Number(moveSlider.value).toFixed(2)}`;
}

function moveCurrentTank(offsetUnits) {
  if (!gameStarted || animating || liveTanks().length <= 1) {
    showToast("게임 진행 중 자기 턴에만 이동할 수 있어요.");
    return;
  }
  const clamped = Math.max(-1, Math.min(1, offsetUnits));
  currentTank().x = turnStartX + clamped * COORD_UNIT;
  previewPath = [];
  updateMoveControls();
  updateUi();
  draw();
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => toast.classList.remove("show"), 3400);
}

function applyDamage(tank, amount, point) {
  const wasAlive = tank.hp > 0;
  tank.hp = Math.max(0, tank.hp - amount);
  tank.lastDamage = amount;
  tank.damageFlashUntil = performance.now() + 900;
  if (wasAlive && tank.hp === 0 && !eliminationOrder.includes(tank)) {
    eliminationOrder.push(tank);
  }
  addExplosion(point);
  setTimeout(() => {
    tank.lastDamage = 0;
    updateUi();
  }, 950);
}

function showResults() {
  const survivors = tanks.filter((tank) => tank.hp > 0);
  const ranked = [...survivors, ...eliminationOrder.slice().reverse()];
  rankingList.innerHTML = "";

  ranked.forEach((tank, index) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="rank">${index + 1}위</span>
      <span class="dot" style="background:${tank.color}"></span>
      <strong>${tank.name}</strong>
      <span>HP ${tank.hp}</span>
      <span>${tank.hp > 0 ? "최후 생존" : "격파"}</span>
    `;
    rankingList.appendChild(item);
  });

  resultsPanel.classList.remove("hidden");
}

function hideResults() {
  resultsPanel.classList.add("hidden");
}

function addExplosion(point) {
  explosions.push({
    x: point.x,
    y: point.y,
    start: performance.now(),
    duration: 850,
  });
  requestAnimationFrame(animateEffects);
}

function animateEffects() {
  const now = performance.now();
  explosions = explosions.filter((explosion) => now - explosion.start < explosion.duration);
  draw();
  if (explosions.length) requestAnimationFrame(animateEffects);
}

function parseTrigFormula(raw) {
  const text = raw.replace(/\s+/g, "").toLowerCase();
  const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const coefficient = `(?:${number}|[+-])`;
  const pattern = new RegExp(`^(${coefficient})?\\*?(sin|cos|tan)(?:\\(([^()]*)\\)|((?:${number})?\\*?x))([+-](?:\\d+(?:\\.\\d*)?|\\.\\d+))?$`);
  const match = text.match(pattern);

  if (!match) {
    throw new Error("함수식은 a*sin(b*x+c)+d 꼴로 입력하세요. 예: 3sinx, 4cos(0.5x)-4");
  }

  let aText = match[1] === undefined || match[1] === "" ? "1" : match[1];
  if (aText === "+") aText = "1";
  if (aText === "-") aText = "-1";
  const a = Number(aText);
  const type = match[2];
  const argument = match[3] ?? match[4];
  const d = match[5] ? Number(match[5]) : 0;
  const parsedArgument = parseLinearArgument(argument);
  const b = parsedArgument.b;
  const c = parsedArgument.c;
  if (!Number.isFinite(a) || a === 0) {
    throw new Error("a는 0이 아닌 숫자로 입력하세요.");
  }
  if (!Number.isFinite(b) || !Number.isFinite(c) || b === 0) {
    throw new Error("b는 0이 아닌 숫자, c는 숫자로 입력하세요.");
  }
  if (!Number.isFinite(d)) {
    throw new Error("d는 숫자로 입력하세요.");
  }

  return {
    a,
    type,
    b,
    c,
    d,
    eval(x) {
      const input = b * x + c;
      let value = Math.sin(input);
      if (type === "cos") value = Math.cos(input);
      if (type === "tan") value = Math.tan(input);
      const y = a * value + d;
      if (!Number.isFinite(y) || Math.abs(y) > MAX_TAN_VALUE) return null;
      return y;
    },
  };
}

function parseLinearArgument(argument) {
  const normalized = argument.replace(/\*/g, "");
  const linearMatch = normalized.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)?)x([+-](?:\d+(?:\.\d*)?|\.\d+))?$/);
  if (!linearMatch) {
    throw new Error("괄호 안은 b*x+c 꼴이어야 해요. b나 c가 1, 0이면 생략할 수 있어요.");
  }

  let bText = linearMatch[1];
  if (bText === "" || bText === "+") bText = "1";
  if (bText === "-") bText = "-1";

  return {
    b: Number(bText),
    c: linearMatch[2] ? Number(linearMatch[2]) : 0,
  };
}

function makePath(formula, maxDistance = 760, step = 4) {
  const startY = formula.eval(0);
  if (startY === null || !Number.isFinite(startY)) throw new Error("x=0에서 정의되는 함수식을 입력하세요.");
  const path = [{ x: 0, y: startY * COORD_UNIT }];
  for (let d = step; d <= maxDistance; d += step) {
    const x = direction * d;
    const y = formula.eval(x / COORD_UNIT);
    if (y === null || !Number.isFinite(y)) break;
    path.push({ x, y: y * COORD_UNIT });
  }
  if (path.length < 12) throw new Error("정의역이 너무 짧아요. b와 c를 조정해 보세요.");
  return path;
}

function worldToScreen(relativeX, relativeY) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const scale = Math.min(width / 1050, height / 590);
  return {
    x: width / 2 + (relativeX - camera.x) * scale,
    y: height * 0.62 - (relativeY - camera.y) * scale,
    scale,
  };
}

function drawSky() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#cfe4f6");
  sky.addColorStop(0.55, "#eef6fb");
  sky.addColorStop(1, "#dce8d1");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const origin = worldToScreen(0, 0);
  ctx.fillStyle = "rgba(91, 116, 137, 0.16)";
  ctx.beginPath();
  ctx.moveTo(0, origin.y + 100);
  for (let sx = 0; sx <= width; sx += 60) {
    const peak = origin.y + 60 + 44 * Math.sin(sx / 95);
    ctx.lineTo(sx, peak);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

function drawGrid() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const origin = worldToScreen(0, 0);
  const step = GRID_UNIT * COORD_UNIT * origin.scale;

  ctx.save();
  ctx.strokeStyle = "rgba(24, 38, 52, 0.34)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = origin.x % step; x < width; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = origin.y % step; y < height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#101820";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(width, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, height);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillRect(origin.x + 5, origin.y - 24, 44, 20);
  ctx.fillStyle = "#1d2b38";
  ctx.font = "13px Segoe UI, sans-serif";
  ctx.fillText("(0,0)", origin.x + 8, origin.y - 8);

  ctx.fillStyle = "#526171";
  const minValue = Math.floor((camera.x - width / origin.scale / 2) / (GRID_UNIT * COORD_UNIT)) - 1;
  const maxValue = Math.ceil((camera.x + width / origin.scale / 2) / (GRID_UNIT * COORD_UNIT)) + 1;
  for (let k = minValue; k <= maxValue; k += 1) {
    if (k === 0) continue;
    const value = k * GRID_UNIT;
    const label = formatPiLabel(k);
    const px = worldToScreen(value * COORD_UNIT, 0);
    if (px.x > 16 && px.x < width - 40) drawGridLabel(label, px.x - 13, origin.y + 18);
  }

  const minYValue = Math.floor((camera.y - height / origin.scale / 2) / (GRID_UNIT * COORD_UNIT)) - 1;
  const maxYValue = Math.ceil((camera.y + height / origin.scale / 2) / (GRID_UNIT * COORD_UNIT)) + 1;
  for (let k = minYValue; k <= maxYValue; k += 1) {
    if (k === 0) continue;
    const value = k * GRID_UNIT;
    const label = formatPiLabel(k);
    const py = worldToScreen(0, value * COORD_UNIT);
    if (py.y > 18 && py.y < height - 12) drawGridLabel(label, origin.x + 8, py.y + 4);
  }
  ctx.restore();
}

function formatPiLabel(k) {
  if (k === 1) return "π";
  if (k === -1) return "-π";
  return `${k}π`;
}

function drawGridLabel(text, x, y) {
  ctx.fillStyle = "#17212b";
  ctx.fillText(text, x, y);
}

function drawTerrain() {
  const me = currentTank();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const topPoints = [];
  const soil = ctx.createLinearGradient(0, 0, 0, height);
  soil.addColorStop(0, "#9f8157");
  soil.addColorStop(0.42, "#745738");
  soil.addColorStop(1, "#3f3325");

  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let sx = 0; sx <= width; sx += 3) {
    const origin = worldToScreen(0, 0);
    const relativeX = (sx - origin.x) / origin.scale;
    const worldX = me.x + relativeX;
    const relativeY = terrainY(worldX) - terrainY(me.x);
    const p = worldToScreen(relativeX, relativeY);
    topPoints.push({ x: sx, y: p.y });
    ctx.lineTo(sx, p.y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = soil;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  topPoints.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.clip();

  for (let layer = 0; layer < 4; layer += 1) {
    ctx.strokeStyle = `rgba(255, 238, 186, ${0.14 - layer * 0.02})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    topPoints.forEach((point, index) => {
      const y = point.y + 22 + layer * 28 + Math.sin((point.x + layer * 40) / 50) * 5;
      if (index === 0) ctx.moveTo(point.x, y);
      else ctx.lineTo(point.x, y);
    });
    ctx.stroke();
  }
  ctx.restore();

  const grass = ctx.createLinearGradient(0, 0, 0, height);
  grass.addColorStop(0, "#a8cf72");
  grass.addColorStop(0.5, "#628840");
  grass.addColorStop(1, "#38542b");
  ctx.beginPath();
  topPoints.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y + 13);
    else ctx.lineTo(point.x, point.y + 13);
  });
  for (let i = topPoints.length - 1; i >= 0; i -= 1) {
    ctx.lineTo(topPoints[i].x, topPoints[i].y - 5);
  }
  ctx.closePath();
  ctx.fillStyle = grass;
  ctx.fill();

  ctx.strokeStyle = "#3d5a2e";
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(24, 37, 17, 0.35)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  topPoints.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < topPoints.length; i += 12) {
    const point = topPoints[i];
    ctx.moveTo(point.x, point.y + 18);
    ctx.lineTo(point.x + 18, point.y + 32);
  }
  ctx.stroke();
}

function drawTank(tank, index) {
  const me = currentTank();
  const relativeX = tank.x - me.x;
  const relativeY = terrainY(tank.x) - terrainY(me.x);
  const p = worldToScreen(relativeX, relativeY);
  const scale = p.scale;
  const active = index === current;
  const aim = active ? direction : relativeX >= 0 ? 1 : -1;
  const flashing = tank.damageFlashUntil && performance.now() < tank.damageFlashUntil;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = tank.hp > 0 ? 1 : 0.26;

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(4 * scale, 7 * scale, 39 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(-10 * scale, -33 * scale, 32 * scale, 10 * scale, -0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#242c34";
  roundRect(-31 * scale, -14 * scale, 62 * scale, 14 * scale, 7 * scale);
  ctx.fill();

  ctx.fillStyle = "#12181f";
  roundRect(-31 * scale, -5 * scale, 62 * scale, 8 * scale, 4 * scale);
  ctx.fill();

  for (let i = -2; i <= 2; i += 1) {
    ctx.fillStyle = "#0e141a";
    ctx.beginPath();
    ctx.arc(i * 13 * scale, -7 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7e8a94";
    ctx.beginPath();
    ctx.arc(i * 13 * scale, -7 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  const body = ctx.createLinearGradient(0, -45 * scale, 0, 0);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.08, tank.color);
  body.addColorStop(1, shade(tank.color, -32));
  ctx.fillStyle = body;
  ctx.strokeStyle = active ? "#111820" : "rgba(17,24,32,0.52)";
  ctx.lineWidth = active ? 3 : 2;
  roundRect(-26 * scale, -36 * scale, 52 * scale, 24 * scale, 6 * scale);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  roundRect(-25 * scale, -22 * scale, 50 * scale, 10 * scale, 4 * scale);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(-17 * scale, -31 * scale);
  ctx.lineTo(12 * scale, -31 * scale);
  ctx.stroke();

  ctx.fillStyle = tank.color;
  ctx.beginPath();
  ctx.arc(0, -38 * scale, 14 * scale, Math.PI, 0);
  ctx.lineTo(14 * scale, -35 * scale);
  ctx.lineTo(-14 * scale, -35 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.arc(-5 * scale, -43 * scale, 5 * scale, Math.PI, Math.PI * 1.95);
  ctx.fill();

  ctx.strokeStyle = "#151d25";
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(aim * 8 * scale, -40 * scale);
  ctx.lineTo(aim * 43 * scale, -51 * scale);
  ctx.stroke();

  if (active) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 42 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#14202b";
  ctx.font = `${Math.max(12, 14 * scale)}px Segoe UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${tank.name} · HP ${tank.hp}`, 0, -64 * scale);

  if (flashing) {
    ctx.strokeStyle = "rgba(229, 83, 75, 0.9)";
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, -25 * scale, 46 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function shade(hex, amount) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (value >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawPath(path, color = "#111820", alpha = 0.72) {
  if (path.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  path.forEach((point, index) => {
    const p = worldToScreen(point.x, point.y);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawMissile() {
  if (!missile) return;
  const point = missile.path[Math.min(missile.index, missile.path.length - 1)];
  const p = worldToScreen(point.x, point.y);
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffb12f";
  ctx.fillStyle = "#f4a62a";
  ctx.beginPath();
  ctx.arc(p.x - direction * 8, p.y + 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#101820";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExplosions() {
  if (!explosions.length) return;
  const now = performance.now();
  explosions.forEach((explosion) => {
    const progress = Math.min(1, (now - explosion.start) / explosion.duration);
    const p = worldToScreen(explosion.x, explosion.y);
    const radius = 10 + progress * 46;
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffb12f";
    ctx.shadowColor = "#ff6b35";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e5534b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#fff2a8";
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10 + progress * 0.7;
      const inner = radius * 0.35;
      const outer = radius * (0.75 + 0.35 * Math.sin(i));
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(angle) * inner, p.y + Math.sin(angle) * inner);
      ctx.lineTo(p.x + Math.cos(angle) * outer, p.y + Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawMiniMap() {
  const width = canvas.clientWidth;
  const pad = 16;
  const mapWidth = Math.min(260, Math.max(190, width * 0.22));
  const mapHeight = 86;
  const x = pad;
  const y = pad;
  const minTankX = Math.min(...tanks.map((tank) => tank.x)) - 70;
  const maxTankX = Math.max(...tanks.map((tank) => tank.x)) + 70;
  const range = maxTankX - minTankX || 1;

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = "rgba(23, 33, 43, 0.18)";
  ctx.lineWidth = 1;
  roundRect(x, y, mapWidth, mapHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#314254";
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("미니맵", x + 10, y + 18);

  ctx.strokeStyle = "rgba(61, 90, 46, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const worldX = minTankX + (range * i) / 120;
    const sx = x + 12 + (i / 120) * (mapWidth - 24);
    const sy = y + 58 - (terrainY(worldX) / 140) * 24;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  tanks.forEach((tank, index) => {
    const sx = x + 12 + ((tank.x - minTankX) / range) * (mapWidth - 24);
    const sy = y + 58 - (terrainY(tank.x) / 140) * 24;
    ctx.globalAlpha = tank.hp > 0 ? 1 : 0.35;
    ctx.fillStyle = tank.color;
    ctx.strokeStyle = index === current ? "#111820" : "rgba(17,24,32,0.45)";
    ctx.lineWidth = index === current ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy - 4, index === current ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const me = currentTank();
  const viewCenterX = me.x + camera.x;
  const viewWidth = canvas.clientWidth / worldToScreen(0, 0).scale;
  const left = x + 12 + ((viewCenterX - viewWidth / 2 - minTankX) / range) * (mapWidth - 24);
  const right = x + 12 + ((viewCenterX + viewWidth / 2 - minTankX) / range) * (mapWidth - 24);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(16, 24, 32, 0.65)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(Math.max(x + 8, left), y + 28, Math.min(mapWidth - 16, right - left), mapHeight - 38);
  ctx.setLineDash([]);

  ctx.restore();
}

function draw() {
  drawSky();
  drawTerrain();
  drawGrid();
  if (previewPath.length) drawPath(previewPath);
  tanks.forEach(drawTank);
  drawMissile();
  drawExplosions();
  drawMiniMap();
}

function hitTest(point) {
  const me = currentTank();
  for (const tank of tanks) {
    if (tank === me || tank.hp <= 0) continue;
    const rx = tank.x - me.x;
    const ry = terrainY(tank.x) - terrainY(me.x) + 27;
    if (Math.hypot(point.x - rx, point.y - ry) < 34) return tank;
  }
  return null;
}

function terrainHit(point) {
  const me = currentTank();
  const terrainRelativeY = terrainY(me.x + point.x) - terrainY(me.x);
  return point.y < terrainRelativeY - 2;
}

function addCrater(point) {
  const me = currentTank();
  const worldX = me.x + point.x;
  craters.push({ x: worldX, radius: 42, depth: 28 });
  addExplosion({ x: point.x, y: point.y + 18 });
  settleTanks();
  showToast("땅이 움푹 패였어요. 주변 탱크가 지형에 맞춰 내려갑니다.");
}

function settleTanks() {
  tanks.forEach((tank) => {
    if (tank.hp <= 0) return;
    const slope = terrainY(tank.x + 12) - terrainY(tank.x - 12);
    tank.x += Math.max(-10, Math.min(10, slope * 0.08));
  });
}

function fire() {
  if (!gameStarted) {
    showToast("모둠 이름을 정한 뒤 게임 시작을 눌러주세요.");
    return;
  }
  if (animating || liveTanks().length <= 1) return;
  const me = currentTank();
  try {
    const formula = parseTrigFormula(formulaInput.value);
    if (me.lastTrigType && formula.type === me.lastTrigType) {
      showToast(`${me.name}은 지난 자기 턴에 ${formula.type} 함수를 사용해서 이번 턴에는 사용할 수 없어요.`);
      return;
    }
    const startY = formula.eval(0);
    if (startY === null || !Number.isFinite(startY)) {
      throw new Error("x=0에서 정의되는 함수식을 입력하세요.");
    }
    if (Math.abs(startY) > ORIGIN_EPSILON) {
      previewPath = [
        { x: 0, y: startY * COORD_UNIT },
        { x: 0, y: 0 },
      ];
      applyDamage(me, 50, { x: 0, y: 25 });
      showToast(`${me.name}의 함수가 원점을 지나지 않아 자기 탱크가 맞았어요. 체력 -50`);
      finishShot();
      return;
    }
    previewPath = makePath(formula);
    me.lastTrigType = formula.type;
  } catch (error) {
    showToast(error.message);
    return;
  }
  missile = { path: previewPath, index: 0 };
  animating = true;
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

function tick(time) {
  if (!animating || !missile) return;
  const delta = Math.min(40, time - lastTime);
  lastTime = time;
  missile.index += Math.max(1, Math.round(delta / 12));

  const point = missile.path[Math.min(missile.index, missile.path.length - 1)];
  const target = hitTest(point);
  if (target) {
    applyDamage(target, 50, point);
    showToast(`${currentTank().name}의 공격이 ${target.name}을 맞췄어요. ${target.hp === 0 ? "격파!" : "체력 -50"}`);
    finishShot();
    return;
  }
  if (terrainHit(point) || missile.index >= missile.path.length - 1) {
    if (terrainHit(point)) addCrater(point);
    showToast("미사일이 빗나갔어요.");
    finishShot();
    return;
  }

  draw();
  requestAnimationFrame(tick);
}

function finishShot() {
  animating = false;
  missile = null;
  updateUi();
  draw();
  if (liveTanks().length <= 1) {
    const winner = liveTanks()[0];
    clearInterval(turnTimerId);
    showToast(winner ? `${winner.name} 승리!` : "무승부입니다.");
    setTimeout(showResults, 900);
    return;
  }
  setTimeout(nextTurn, 850);
}

function preview() {
  if (!gameStarted) {
    showToast("모둠 이름을 정한 뒤 게임 시작을 눌러주세요.");
    return;
  }
  const tank = currentTank();
  if (turnPreviewCount >= MAX_PREVIEWS) {
    showToast(`${tank.name}은 미리보기 ${MAX_PREVIEWS}회를 모두 사용했어요.`);
    return;
  }
  try {
    previewPath = makePath(parseTrigFormula(formulaInput.value));
    turnPreviewCount += 1;
    updateUi();
    draw();
    showToast(`${tank.name}의 미리보기 ${turnPreviewCount}/${MAX_PREVIEWS}회를 사용했어요.`);
  } catch (error) {
    showToast(error.message);
  }
}

function updateUi() {
  const me = currentTank();
  turnName.textContent = me.name;
  currentTitle.textContent = me.name;
  currentBadge.style.background = me.color;
  previewBtn.disabled = turnPreviewCount >= MAX_PREVIEWS;
  previewBtn.textContent = turnPreviewCount >= MAX_PREVIEWS ? "미리보기 사용 완료" : `그래프 미리보기 (${MAX_PREVIEWS - turnPreviewCount}회 남음)`;
  teamsEl.innerHTML = "";

  tanks.forEach((tank, index) => {
    const row = document.createElement("div");
    row.className = `team${tank.hp <= 0 ? " out" : ""}${index === current ? " active" : ""}`;

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = tank.color;

    const body = document.createElement("div");
    const nameLabel = document.createElement("div");
    nameLabel.className = "name-label";
    nameLabel.textContent = "이름 수정";

    const input = document.createElement("input");
    input.className = "team-name";
    input.value = tank.name;
    input.maxLength = 14;
    input.placeholder = `${index + 1}모둠 이름`;
    input.ariaLabel = `${index + 1}모둠 이름`;
    input.addEventListener("input", () => {
      tank.name = input.value.trim() || `${index + 1}모둠`;
      turnName.textContent = currentTank().name;
      currentTitle.textContent = currentTank().name;
      draw();
    });

    const hp = document.createElement("div");
    hp.className = tank.lastDamage ? "hp hit" : "hp";
    const damageStart = tank.hp;
    const damageWidth = Math.min(100 - damageStart, tank.lastDamage || 0);
    hp.innerHTML = `
      <span class="fill" style="width:${tank.hp}%"></span>
      ${tank.lastDamage ? `<span class="loss" style="left:${damageStart}%; width:${damageWidth}%"></span>` : ""}
    `;

    const used = document.createElement("div");
    used.className = "preview-used";
    const timeText = index === current ? ` · 남은 시간 ${turnTimer.textContent}` : "";
    const banText = tank.lastTrigType ? ` · 금지: ${tank.lastTrigType}` : "";
    used.textContent = index === current ? `턴 · 미리보기 ${turnPreviewCount}/${MAX_PREVIEWS}${timeText}${banText}` : `대기 중${banText}`;

    body.append(nameLabel, input, hp, used);

    const score = document.createElement("span");
    score.className = tank.lastDamage ? "hp-score hit" : "hp-score";
    score.textContent = `HP ${tank.hp}`;

    row.append(dot, body, score);
    teamsEl.appendChild(row);
  });
}

function resetGame() {
  clearInterval(turnTimerId);
  tanks = structuredClone(initialTanks);
  current = 0;
  direction = 1;
  previewPath = [];
  missile = null;
  animating = false;
  gameStarted = false;
  turnPreviewCount = 0;
  eliminationOrder = [];
  craters = [];
  turnStartX = tanks[0].x;
  hideResults();
  resetCamera();
  startBtn.disabled = false;
  startBtn.textContent = "게임 시작";
  setDirection(1);
  updateMoveControls();
  resetTurnTimer();
  updateUi();
  draw();
  showToast("새 게임을 준비했어요. 이름을 바꾼 뒤 게임 시작을 눌러주세요.");
}

leftBtn.addEventListener("click", () => setDirection(-1));
rightBtn.addEventListener("click", () => setDirection(1));
moveLeftBtn.addEventListener("click", () => moveCurrentTank(Number(moveSlider.value) - 0.1));
moveRightBtn.addEventListener("click", () => moveCurrentTank(Number(moveSlider.value) + 0.1));
moveSlider.addEventListener("input", () => moveCurrentTank(Number(moveSlider.value)));
fireBtn.addEventListener("click", fire);
previewBtn.addEventListener("click", preview);
resetBtn.addEventListener("click", resetGame);
startBtn.addEventListener("click", startGame);
closeResultsBtn.addEventListener("click", hideResults);
canvas.addEventListener("pointerdown", beginDrag);
canvas.addEventListener("pointermove", moveDrag);
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("pointerleave", endDrag);
formulaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") fire();
});
document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    formulaInput.value = button.dataset.example;
  });
});
window.addEventListener("resize", resizeCanvas);

updateUi();
resizeCanvas();
updateMoveControls();
resetTurnTimer();
showToast("모둠 이름을 정한 뒤 게임 시작을 눌러주세요.");
