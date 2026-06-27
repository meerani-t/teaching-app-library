const LEVEL_SECONDS = 120;
const BITE_SECONDS = 30;
const LEVEL_BITE_SECONDS = {
  1: 30,
  2: 40,
  3: 60,
};
const SPAWN_GAP_SECONDS = 9;
const MAX_LEVEL = 3;
const MAX_ZOMBIES = 3;
const LANES = [-1, 0, 1];
const LANE_SETTINGS = {
  "-1": { zombieSide: -1, zombieY: -4, cardSide: 1, cardYOffset: -4, handX: 12 },
  "0": { zombieSide: 0, zombieY: 5, cardSide: 1, cardYOffset: 5, handX: 12 },
  "1": { zombieSide: 1, zombieY: -1, cardSide: -1, cardYOffset: -3, handX: 12 },
};

const state = {
  level: 1,
  hp: 3,
  totalScore: 0,
  levelScores: [0, 0, 0],
  levelPoints: [0, 0, 0],
  nextPlayableLevel: 1,
  groupName: "",
  levelStudents: ["", "", ""],
  timeLeft: LEVEL_SECONDS,
  running: false,
  zombies: [],
  selectedZombieId: null,
  nextZombieId: 1,
  nextSpawnAt: 0,
  rafId: 0,
  timerId: 0,
};

const el = {
  levelText: document.querySelector("#levelText"),
  timeText: document.querySelector("#timeText"),
  scoreText: document.querySelector("#scoreText"),
  hpText: document.querySelector("#hpText"),
  zombieTrack: document.querySelector("#zombieTrack"),
  formulaLayer: document.querySelector("#formulaLayer"),
  answerInput: document.querySelector("#answerInput"),
  submitBtn: document.querySelector("#submitBtn"),
  feedback: document.querySelector("#feedback"),
  modal: document.querySelector("#modal"),
  modalTitle: document.querySelector("#modalTitle"),
  modalText: document.querySelector("#modalText"),
  modalBtn: document.querySelector("#modalBtn"),
  levelSummary: document.querySelector("#levelSummary"),
  biteFlash: document.querySelector("#biteFlash"),
  levelChoices: document.querySelectorAll("[data-level-choice]"),
  groupNameInput: document.querySelector("#groupNameInput"),
  studentInputs: [
    document.querySelector("#level1StudentInput"),
    document.querySelector("#level2StudentInput"),
    document.querySelector("#level3StudentInput"),
  ],
};

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const choice = (items) => items[rnd(0, items.length - 1)];
const sign = (n) => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);

function makeProblem(level) {
  const banks = [levelOneProblem, levelTwoProblem, levelThreeProblem];
  return banks[level - 1]();
}

function levelOneProblem() {
  const templates = [
    () => {
      const a = rnd(-3, 4);
      const m = choice([-2, -1, 1, 2, 3]);
      const b = rnd(-5, 5);
      return problem(`x \\to ${a}`, `${m}x ${sign(b)}`, m * a + b);
    },
    () => {
      const a = rnd(-3, 3);
      const c = rnd(0, 5);
      return problem(`x \\to ${a}`, `x² ${sign(c)}`, a * a + c);
    },
    () => {
      const a = choice([1, 2, 3, 4, 5]);
      const c = rnd(1, 5);
      return problem(`x \\to ${a - c}`, `√(x ${sign(c)})`, radicalAnswer(a));
    },
    () => {
      const p = choice([-3, -2, -1, 1, 2, 3]);
      const q = choice([1, 2, 3, 4]);
      return problem(`x \\to ∞`, `(${p}x ${sign(rnd(-4, 4))}) / (${q}x ${sign(rnd(1, 6))})`, fraction(p, q));
    },
    () => {
      const m = choice([1, 2, 3]);
      return problem(`x \\to ∞`, `${m}x² ${sign(rnd(-5, 5))}`, "∞");
    },
    () => {
      const m = choice([1, 2, 3]);
      return problem(`x \\to -∞`, `${m}x³ ${sign(rnd(-5, 5))}`, "-∞");
    },
  ];
  return choice(templates)();
}

function levelTwoProblem() {
  const templates = [
    () => {
      const a = choice([-4, -3, -2, 2, 3, 4]);
      return problem(`x \\to ${a}`, `(x² - ${a * a}) / (x ${sign(-a)})`, 2 * a);
    },
    () => {
      const a = choice([-3, -2, -1, 1, 2, 3]);
      const b = choice([-4, -2, 2, 4]);
      return problem(`x \\to ${a}`, `(x² ${sign(-(a + b))}x ${sign(a * b)}) / (x ${sign(-a)})`, a - b);
    },
    () => {
      const setup = radicalDifferenceSetup();
      return problem(
        `x \\to ${setup.a}`,
        `(√(x ${sign(setup.k)}) - √${setup.n}) / (x ${sign(-setup.a)})`,
        setup.answer,
        [`1/(2√${setup.n})`],
      );
    },
    () => {
      const p = choice([-4, -2, 2, 4]);
      const q = choice([1, 2, 3, 4]);
      return problem(`x \\to -∞`, `(${p}x² ${sign(rnd(-3, 3))}) / (${q}x² ${sign(rnd(1, 5))})`, fraction(p, q));
    },
    () => {
      const p = choice([1, 2, 3]);
      const q = choice([1, 2, 3]);
      return problem(`x \\to ∞`, `(${p}x² ${sign(rnd(0, 5))}) / (${q}x ${sign(rnd(1, 6))})`, "∞");
    },
    () => {
      const a = choice([-3, -2, -1, 1, 2, 3]);
      return problem(`x \\to ${a}+`, `1 / (x ${sign(-a)})`, "∞");
    },
    () => {
      const a = choice([-3, -2, -1, 1, 2, 3]);
      return problem(`x \\to ${a}-`, `1 / (x ${sign(-a)})`, "-∞");
    },
  ];
  return choice(templates)();
}

function levelThreeProblem() {
  const templates = [
    () => {
      const a = choice([-3, -2, -1, 1, 2, 3]);
      const b = choice([-4, -2, 2, 4]);
      return problem(`x \\to ${a}`, `((x ${sign(-a)})(x ${sign(-b)})) / (x ${sign(-a)})`, a - b);
    },
    () => {
      const a = choice([-3, -2, -1, 1, 2, 3]);
      const k = choice([1, 2, 3, 4]);
      return problem(`x \\to ${a}`, `(x² ${sign(k)}x ${sign(-a * (a + k))}) / (x ${sign(-a)})`, 2 * a + k);
    },
    () => {
      const a = choice([1, 2, 3, 4]);
      return problem(`x \\to ∞`, `√(x² ${sign(2 * a)}x) - x`, a);
    },
    () => {
      const a = choice([1, 2, 3, 4]);
      return problem(`x \\to -∞`, `√(x² ${sign(2 * a)}x) + x`, -a);
    },
    () => {
      const a = choice([-2, -1, 1, 2]);
      const numeratorSign = choice([1, -1]);
      return problem(`x \\to ${a}+`, `${numeratorSign} / (x ${sign(-a)})²`, numeratorSign > 0 ? "∞" : "-∞");
    },
    () => {
      const setup = radicalDifferenceSetup();
      return problem(
        `x \\to ${setup.a}`,
        `(√(x ${sign(setup.k)}) - √${setup.n}) / (x ${sign(-setup.a)})`,
        setup.answer,
        [`1/(2√${setup.n})`],
      );
    },
    () => {
      const p = choice([-3, -2, 2, 3]);
      const q = choice([1, 2, 3]);
      return problem(`x \\to -∞`, `(${p}x³ ${sign(rnd(-3, 3))}) / (${q}x² ${sign(rnd(1, 4))})`, p > 0 ? "-∞" : "∞");
    },
  ];
  return choice(templates)();
}

function problem(approach, expression, answer, extraAliases = []) {
  const answerText = String(answer);
  return {
    approach,
    expression,
    answer: answerText,
    aliases: [...new Set([answerText, ...extraAliases.map(String)])],
  };
}

function radicalAnswer(n) {
  const root = Math.sqrt(n);
  return Number.isInteger(root) ? String(root) : `√${n}`;
}

function radicalDifferenceSetup() {
  const n = choice([1, 4, 9]);
  const a = choice([-3, -2, -1, 1, 2, 3]);
  return {
    a,
    k: n - a,
    n,
    answer: fraction(1, 2 * Math.sqrt(n)),
  };
}

function fraction(n, d) {
  if (!Number.isInteger(n) || !Number.isInteger(d)) return `${n}/${d}`;
  const divisor = gcd(Math.abs(n), Math.abs(d));
  n /= divisor;
  d /= divisor;
  if (d < 0) {
    n *= -1;
    d *= -1;
  }
  return d === 1 ? String(n) : `${n}/${d}`;
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function startLevel(level) {
  state.level = level;
  state.timeLeft = LEVEL_SECONDS;
  state.running = true;
  state.zombies = [];
  state.selectedZombieId = null;
  state.nextZombieId = 1;
  state.nextSpawnAt = performance.now();
  el.zombieTrack.innerHTML = "";
  el.formulaLayer.innerHTML = "";
  el.modal.classList.add("hidden");
  el.feedback.textContent = "";
  el.feedback.className = "feedback";
  updateHud();
  clearInterval(state.timerId);
  state.timerId = setInterval(tickLevelTimer, 1000);
  cancelAnimationFrame(state.rafId);
  state.rafId = requestAnimationFrame(updateGame);
  setTimeout(() => el.answerInput.focus(), 60);
}

function chooseLevel(level) {
  if (state.running || level !== state.nextPlayableLevel) return;
  if (level === 1) {
    state.totalScore = 0;
    state.levelScores = [0, 0, 0];
    state.levelPoints = [0, 0, 0];
    captureTeamInfo();
  }
  state.hp = 3;
  clearInterval(state.timerId);
  cancelAnimationFrame(state.rafId);
  el.zombieTrack.innerHTML = "";
  el.formulaLayer.innerHTML = "";
  startLevel(level);
}

function captureTeamInfo() {
  state.groupName = cleanName(el.groupNameInput.value, "이름 없는 모둠");
  state.levelStudents = el.studentInputs.map((input, index) => cleanName(input.value, `레벨 ${index + 1} 학생`));
}

function cleanName(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function updateGame(now) {
  if (!state.running) return;

  if (now >= state.nextSpawnAt && state.zombies.length < MAX_ZOMBIES) {
    spawnZombie(now);
    state.nextSpawnAt = now + SPAWN_GAP_SECONDS * 1000;
  }

  for (const zombie of [...state.zombies]) {
    const progress = Math.min(100, ((now - zombie.createdAt) / 1000 / biteSecondsForLevel()) * 100);
    zombie.progress = progress;
    zombie.node.style.setProperty("--progress", progress.toFixed(2));
    positionFormulaCard(zombie, progress);
    if (progress >= 100) {
      bitePlayer(zombie);
      break;
    }
  }

  state.rafId = requestAnimationFrame(updateGame);
}

function biteSecondsForLevel() {
  return LEVEL_BITE_SECONDS[state.level] || BITE_SECONDS;
}

function spawnZombie(now) {
  const problemData = makeProblem(state.level);
  const usedLanes = new Set(state.zombies.map((zombie) => zombie.lane));
  const openLanes = LANES.filter((lane) => !usedLanes.has(lane));
  const lane = choice(openLanes.length ? openLanes : LANES);
  const node = createZombieNode(problemData, lane);
  const cardNode = createFormulaNode(problemData, lane);
  const zombie = {
    id: state.nextZombieId,
    lane,
    createdAt: now,
    progress: 0,
    problem: problemData,
    node,
    cardNode,
  };
  state.nextZombieId += 1;
  state.zombies.push(zombie);
  node.addEventListener("click", () => selectZombie(zombie.id));
  cardNode.addEventListener("click", (event) => {
    event.stopPropagation();
    selectZombie(zombie.id);
  });
  el.zombieTrack.appendChild(node);
  el.formulaLayer.appendChild(cardNode);
  positionFormulaCard(zombie, 0);
  if (state.selectedZombieId === null) selectZombie(zombie.id);
  sortZombies();
}

function selectZombie(id) {
  if (!state.running) return;
  const target = state.zombies.find((zombie) => zombie.id === id);
  if (!target) return;
  state.selectedZombieId = id;
  state.zombies.forEach((zombie) => {
    zombie.node.classList.toggle("is-selected", zombie.id === id);
    zombie.cardNode.classList.toggle("is-selected", zombie.id === id);
    positionFormulaCard(zombie, zombie.progress);
  });
  const number = state.zombies.findIndex((zombie) => zombie.id === id) + 1;
  el.feedback.textContent = `${number}번째 좀비 문제를 선택했습니다.`;
  el.feedback.className = "feedback";
  el.answerInput.focus();
}

function createZombieNode(problemData, lane) {
  const node = document.createElement("div");
  const settings = LANE_SETTINGS[String(lane)] || LANE_SETTINGS["0"];
  node.className = `zombie ${settings.cardSide > 0 ? "hold-right" : "hold-left"}`;
  node.style.setProperty("--lane", lane);
  node.style.setProperty("--lane-y", `${settings.zombieY}%`);
  node.style.setProperty("--progress", "0");
  node.innerHTML = `
    <div class="death-bubble">켁~</div>
    <div class="zombie-head">
      <span class="eye left"></span>
      <span class="eye right"></span>
      <span class="mouth"></span>
    </div>
    <div class="zombie-body"></div>
    <div class="zombie-arms"><span></span><span></span></div>
    <div class="zombie-legs"><span></span><span></span></div>
  `;
  return node;
}

function createFormulaNode(problemData, lane) {
  const node = document.createElement("button");
  node.className = "problem-card formula-card";
  node.type = "button";
  node.style.setProperty("--card-left", `${50 + lane * 30}%`);
  node.style.setProperty("--card-top", "20%");
  node.innerHTML = `<img class="expression-img" alt="극한 문제" src="${problemImage(problemData)}" />`;
  return node;
}

function positionFormulaCard(zombie, progress) {
  const depth = Math.min(100, progress) / 100;
  const settings = LANE_SETTINGS[String(zombie.lane)] || LANE_SETTINGS["0"];
  const zombieOffset = settings.zombieSide * (10 + depth * 24);
  const selectedBoost = zombie.id === state.selectedZombieId ? 1000 : 0;
  const handOffset = settings.cardSide * (settings.handX + depth * 8);
  const cardLeft = 50 + zombieOffset + handOffset;
  const cardTop = 19 + settings.zombieY + settings.cardYOffset + progress * 0.43;
  zombie.cardNode.style.setProperty("--card-left", `${cardLeft}%`);
  zombie.cardNode.style.setProperty("--card-top", `${cardTop}%`);
  zombie.cardNode.classList.toggle("held-right", settings.cardSide > 0);
  zombie.cardNode.classList.toggle("held-left", settings.cardSide < 0);
  zombie.cardNode.style.zIndex = String(600 + selectedBoost + Math.round(progress));
}

function problemImage(problemData) {
  const svg = mathSvg(problemData);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function mathSvg(problemData) {
  const expression = formatExpression(problemData.expression);
  const approach = formatExpression(problemData.approach);
  const expressionSvg = expressionParts(expression, 90, 38);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="150" viewBox="0 0 320 150">
      <rect x="3" y="3" width="314" height="144" rx="14" fill="#fbf7ea" fill-opacity="0.42" stroke="#263238" stroke-opacity="0.82" stroke-width="6"/>
      <g font-family="Segoe UI, Noto Sans KR, Arial, sans-serif" fill="#192022" font-weight="900">
        <text x="18" y="70" font-size="40">lim</text>
        <text x="12" y="99" font-size="18">${escapeSvg(approach)}</text>
        ${expressionSvg}
      </g>
    </svg>
  `.trim();
}

function expressionParts(expression, x, y) {
  const fraction = splitFraction(expression);
  if (fraction) {
    const numerator = stripOuterParens(fraction[0]);
    const denominator = stripOuterParens(fraction[1]);
    return `
      ${inlineExpression(numerator, x, y)}
      <line x1="${x}" y1="${y + 31}" x2="300" y2="${y + 31}" stroke="#192022" stroke-width="5" stroke-linecap="round"/>
      ${inlineExpression(denominator, x, y + 68)}
    `;
  }

  return inlineExpression(expression, x, y + 26);
}

function inlineExpression(expression, x, y) {
  const root = splitFirstRoot(expression);
  if (!root) {
    return `<text x="${x}" y="${y}" font-size="30">${escapeSvg(expression)}</text>`;
  }

  const beforeWidth = Math.max(0, root.before.length * 17);
  const rootX = x + beforeWidth;
  const rootTextWidth = Math.max(50, root.inside.length * 17 + 16);
  const afterX = rootX + rootTextWidth + 39;
  return `
    <text x="${x}" y="${y}" font-size="30">${escapeSvg(root.before)}</text>
    <text x="${rootX}" y="${y}" font-size="38">√</text>
    <line x1="${rootX + 32}" y1="${y - 34}" x2="${rootX + 32 + rootTextWidth}" y2="${y - 34}" stroke="#192022" stroke-width="4" stroke-linecap="round"/>
    <text x="${rootX + 37}" y="${y}" font-size="30">${escapeSvg(root.inside)}</text>
    <text x="${afterX}" y="${y}" font-size="30">${escapeSvg(root.after)}</text>
  `;
}

function splitFraction(expression) {
  const index = expression.indexOf(" / ");
  if (index === -1) return null;
  return [expression.slice(0, index), expression.slice(index + 3)];
}

function splitFirstRoot(expression) {
  const rootIndex = expression.indexOf("√");
  if (rootIndex === -1) return null;

  const before = expression.slice(0, rootIndex);
  const rest = expression.slice(rootIndex + 1);
  if (!rest.startsWith("(")) {
    const match = rest.match(/^([^)\s+\-]+)(.*)$/);
    return {
      before,
      inside: match ? match[1] : rest,
      after: match ? match[2] : "",
    };
  }

  let depth = 0;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "(") depth += 1;
    if (rest[i] === ")") depth -= 1;
    if (depth === 0) {
      return {
        before,
        inside: rest.slice(1, i),
        after: rest.slice(i + 1),
      };
    }
  }

  return { before, inside: rest.slice(1), after: "" };
}

function stripOuterParens(value) {
  const text = value.trim();
  if (text.startsWith("(") && text.endsWith(")")) return text.slice(1, -1);
  return text;
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sortZombies() {
  state.zombies
    .slice()
    .sort((a, b) => a.progress - b.progress)
    .forEach((zombie) => el.zombieTrack.appendChild(zombie.node));

  state.zombies
    .slice()
    .sort((a, b) => b.progress - a.progress)
    .forEach((zombie) => el.formulaLayer.appendChild(zombie.cardNode));
}

function removeZombie(zombie) {
  state.zombies = state.zombies.filter((item) => item.id !== zombie.id);
  if (state.selectedZombieId === zombie.id) {
    state.selectedZombieId = null;
    selectNearestZombie();
  }
  zombie.node.remove();
  zombie.cardNode.remove();
}

function selectNearestZombie() {
  if (!state.running || state.zombies.length === 0) return;
  const nearest = state.zombies.slice().sort((a, b) => b.progress - a.progress)[0];
  selectZombie(nearest.id);
}

function formatExpression(text) {
  return text
    .replaceAll("\\to", "→")
    .replaceAll("sqrt", "√")
    .replaceAll("*", "")
    .replace(/(^|[\s(])1x/g, "$1x")
    .replace(/(^|[\s(])-1x/g, "$1-x")
    .replace(/\+ 1x/g, "+ x")
    .replace(/- 1x/g, "- x")
    .replaceAll("^2", "²")
    .replaceAll("^3", "³");
}

function bitePlayer(zombie) {
  state.hp -= 1;
  updateHud();
  el.biteFlash.classList.remove("show");
  void el.biteFlash.offsetWidth;
  el.biteFlash.classList.add("show");
  removeZombie(zombie);
  state.nextSpawnAt = Math.min(state.nextSpawnAt, performance.now() + 1000);

  if (state.hp <= 0) {
    endGame(false);
    return;
  }

  el.feedback.textContent = `좀비에게 물렸어요. 남은 HP ${state.hp}`;
  el.feedback.className = "feedback bad";
}

function tickLevelTimer() {
  if (!state.running) return;
  state.timeLeft -= 1;
  updateHud();
  if (state.timeLeft <= 0) {
    completeLevel();
  }
}

function submitAnswer() {
  if (!state.running) return;
  const user = normalizeAnswer(el.answerInput.value);
  if (!user) {
    setFeedback("정답을 입력하세요.", false);
    return;
  }

  const selected = state.zombies.find((zombie) => zombie.id === state.selectedZombieId);
  const candidates = selected
    ? [selected]
    : state.zombies.slice().sort((a, b) => b.progress - a.progress);
  const target = candidates.find((zombie) => zombie.problem.aliases.some((answer) => normalizeAnswer(answer) === user));

  if (!target) {
    setFeedback(selected ? "선택한 좀비의 정답이 아니에요." : "아직 아니에요. 먼저 풀 좀비를 선택하세요.", false);
    return;
  }

  const points = state.level;
  state.totalScore += points;
  state.levelScores[state.level - 1] += 1;
  state.levelPoints[state.level - 1] += points;
  updateHud();
  setFeedback(`정답! +${points}점. 좀비가 켁~ 하고 쓰러졌습니다.`, true);
  target.node.classList.add("is-dead");
  target.cardNode.classList.add("is-dead");
  state.zombies = state.zombies.filter((zombie) => zombie.id !== target.id);
  if (state.selectedZombieId === target.id) {
    state.selectedZombieId = null;
    setTimeout(selectNearestZombie, 700);
  }
  el.answerInput.value = "";
  state.nextSpawnAt = Math.min(state.nextSpawnAt, performance.now() + 700);

  setTimeout(() => {
    target.node.remove();
    target.cardNode.remove();
  }, 650);
}

function normalizeAnswer(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replaceAll("−", "-")
    .replaceAll("루트", "√")
    .replaceAll("sqrt", "√")
    .replaceAll("무한대", "∞")
    .replaceAll("infinity", "∞")
    .replaceAll("inf", "∞")
    .replaceAll("∞+", "∞")
    .replaceAll("+∞", "∞");
}

function setFeedback(message, good) {
  el.feedback.textContent = message;
  el.feedback.className = good ? "feedback good" : "feedback bad";
}

function updateHud() {
  el.levelText.textContent = state.level;
  el.timeText.textContent = formatTime(state.timeLeft);
  el.scoreText.textContent = state.totalScore;
  el.hpText.textContent = "♥ ".repeat(Math.max(0, state.hp)).trim() || "0";
  el.levelChoices.forEach((button) => {
    const buttonLevel = Number(button.dataset.levelChoice);
    button.classList.toggle("is-active", buttonLevel === state.level);
    button.disabled = state.running || buttonLevel !== state.nextPlayableLevel;
  });
  const lockNames = state.running || state.nextPlayableLevel !== 1 || state.totalScore > 0;
  el.groupNameInput.disabled = lockNames;
  el.studentInputs.forEach((input) => {
    input.disabled = lockNames;
  });
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function completeLevel() {
  state.running = false;
  clearInterval(state.timerId);
  cancelAnimationFrame(state.rafId);
  el.zombieTrack.innerHTML = "";
  el.formulaLayer.innerHTML = "";
  state.zombies = [];
  state.selectedZombieId = null;
  if (state.level >= MAX_LEVEL) {
    endGame(true);
    return;
  }
  state.nextPlayableLevel = state.level + 1;
  updateHud();
  showLevelReady(state.level + 1);
}

function showLevelReady(nextLevel) {
  el.modal.classList.remove("hidden");
  el.modalTitle.textContent = `레벨 ${state.level} 통과`;
  el.modalText.textContent = `상단의 레벨 ${nextLevel} 버튼을 누르면 다음 레벨이 시작됩니다. 점수는 계속 누적됩니다.`;
  el.levelSummary.innerHTML = summaryHtml();
  el.modalBtn.textContent = "확인";
  el.modalBtn.onclick = () => {
    el.modal.classList.add("hidden");
    updateHud();
  };
}

function endGame(cleared) {
  state.running = false;
  clearInterval(state.timerId);
  cancelAnimationFrame(state.rafId);
  el.zombieTrack.innerHTML = "";
  el.formulaLayer.innerHTML = "";
  state.zombies = [];
  state.selectedZombieId = null;
  if (cleared) state.nextPlayableLevel = 1;
  el.modal.classList.remove("hidden");
  el.modalTitle.textContent = cleared ? `최종 점수 ${state.totalScore}점` : "게임 오버";
  el.modalText.textContent = cleared
    ? "레벨 1, 2, 3을 한 번씩 모두 마쳤습니다. 다시 시작하려면 확인 후 레벨 1 버튼을 누르세요."
    : "세 번째로 물려 쓰러졌습니다. 다시 도전하려면 상단의 레벨 버튼을 누르세요.";
  el.levelSummary.innerHTML = summaryHtml();
  el.modalBtn.textContent = "확인";
  el.modalBtn.onclick = resetGame;
}

function summaryHtml() {
  return `
    <div>모둠: ${escapeHtml(state.groupName || cleanName(el.groupNameInput.value, "이름 없는 모둠"))}</div>
    <div>레벨 1 담당: ${escapeHtml(state.levelStudents[0] || cleanName(el.studentInputs[0].value, "레벨 1 학생"))}</div>
    <div>레벨 2 담당: ${escapeHtml(state.levelStudents[1] || cleanName(el.studentInputs[1].value, "레벨 2 학생"))}</div>
    <div>레벨 3 담당: ${escapeHtml(state.levelStudents[2] || cleanName(el.studentInputs[2].value, "레벨 3 학생"))}</div>
    <div>레벨 1: ${state.levelScores[0]}문제 × 1점 = ${state.levelPoints[0]}점</div>
    <div>레벨 2: ${state.levelScores[1]}문제 × 2점 = ${state.levelPoints[1]}점</div>
    <div>레벨 3: ${state.levelScores[2]}문제 × 3점 = ${state.levelPoints[2]}점</div>
    <div>총점: ${state.totalScore}점</div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resetGame() {
  state.level = 1;
  state.hp = 3;
  state.totalScore = 0;
  state.levelScores = [0, 0, 0];
  state.levelPoints = [0, 0, 0];
  state.nextPlayableLevel = 1;
  state.groupName = "";
  state.levelStudents = ["", "", ""];
  state.timeLeft = LEVEL_SECONDS;
  state.zombies = [];
  state.nextZombieId = 1;
  state.selectedZombieId = null;
  el.zombieTrack.innerHTML = "";
  el.formulaLayer.innerHTML = "";
  updateHud();
  el.modal.classList.add("hidden");
  el.modalTitle.textContent = "극한 좀비 생존전";
  el.modalText.textContent = "상단의 레벨 버튼을 누르면 시작합니다.";
  el.levelSummary.innerHTML = "";
  el.modalBtn.textContent = "확인";
  el.modalBtn.onclick = () => el.modal.classList.add("hidden");
}

document.querySelectorAll(".quick-keys button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.clear) {
      el.answerInput.value = "";
      el.answerInput.focus();
      return;
    }
    const insert = button.dataset.insert || "";
    const start = el.answerInput.selectionStart ?? el.answerInput.value.length;
    const end = el.answerInput.selectionEnd ?? el.answerInput.value.length;
    el.answerInput.value = el.answerInput.value.slice(0, start) + insert + el.answerInput.value.slice(end);
    const next = start + insert.length;
    el.answerInput.setSelectionRange(next, next);
    el.answerInput.focus();
  });
});

el.levelChoices.forEach((button) => {
  button.addEventListener("click", () => chooseLevel(Number(button.dataset.levelChoice)));
});

el.submitBtn.addEventListener("click", submitAnswer);
el.answerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitAnswer();
});
el.modalBtn.onclick = () => el.modal.classList.add("hidden");
el.feedback.textContent = "상단의 레벨 버튼을 눌러 시작하세요.";
updateHud();
