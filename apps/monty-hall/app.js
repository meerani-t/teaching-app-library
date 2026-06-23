const doors = [...document.querySelectorAll(".door")];
const message = document.querySelector("#message");
const stepLabel = document.querySelector("#stepLabel");
const choiceActions = document.querySelector("#choiceActions");
const newGameButton = document.querySelector("#newGameButton");
const stayButton = document.querySelector("#stayButton");
const switchButton = document.querySelector("#switchButton");
const resetStatsButton = document.querySelector("#resetStatsButton");
const runSimulationButton = document.querySelector("#runSimulationButton");
const simulationCount = document.querySelector("#simulationCount");
const simulationResults = document.querySelector("#simulationResults");

let state;
let stats = loadStats();

function randomDoor() {
  return Math.floor(Math.random() * 3);
}

function newGame() {
  state = {
    carDoor: randomDoor(),
    selectedDoor: null,
    openedDoor: null,
    finished: false,
  };

  doors.forEach((door) => {
    door.disabled = false;
    door.className = "door";
    door.querySelector(".door-content").textContent = "?";
  });
  choiceActions.hidden = true;
  stepLabel.textContent = "1단계 · 문을 고르세요";
  message.textContent = "마음이 가는 문을 하나 선택해 보세요.";
}

function chooseDoor(index) {
  if (state.selectedDoor !== null || state.finished) return;

  state.selectedDoor = index;
  const hostOptions = [0, 1, 2].filter(
    (door) => door !== state.selectedDoor && door !== state.carDoor
  );
  state.openedDoor = hostOptions[Math.floor(Math.random() * hostOptions.length)];

  doors[index].classList.add("selected");
  revealDoor(state.openedDoor);
  doors[state.openedDoor].disabled = true;
  stepLabel.textContent = "2단계 · 유지할까요, 바꿀까요?";
  message.textContent = `${state.openedDoor + 1}번 문에는 염소가 있습니다. 선택을 결정하세요.`;
  choiceActions.hidden = false;
}

function revealDoor(index) {
  const isCar = index === state.carDoor;
  const door = doors[index];
  door.classList.add("open");
  if (isCar) door.classList.add("winner");
  door.querySelector(".door-content").textContent = isCar ? "🚗" : "🐐";
}

function finishGame(strategy) {
  if (state.finished || state.selectedDoor === null) return;

  const finalDoor =
    strategy === "stay"
      ? state.selectedDoor
      : [0, 1, 2].find(
          (door) => door !== state.selectedDoor && door !== state.openedDoor
        );

  state.finished = true;
  doors.forEach((door) => {
    door.disabled = true;
    door.classList.remove("selected");
  });
  doors[finalDoor].classList.add("selected");
  [0, 1, 2].forEach(revealDoor);

  const won = finalDoor === state.carDoor;
  stats.total += 1;
  stats[strategy].plays += 1;
  if (won) stats[strategy].wins += 1;
  saveStats();
  renderStats();

  choiceActions.hidden = true;
  stepLabel.textContent = "결과";
  message.textContent = won
    ? `성공! ${finalDoor + 1}번 문에서 자동차를 찾았습니다.`
    : `아쉽네요. 자동차는 ${state.carDoor + 1}번 문에 있었습니다.`;
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem("montyHallStats")) || defaultStats();
  } catch {
    return defaultStats();
  }
}

function defaultStats() {
  return {
    total: 0,
    stay: { plays: 0, wins: 0 },
    switch: { plays: 0, wins: 0 },
  };
}

function saveStats() {
  localStorage.setItem("montyHallStats", JSON.stringify(stats));
}

function percentage(wins, plays) {
  return plays ? `${((wins / plays) * 100).toFixed(1)}%` : "—";
}

function renderStats() {
  document.querySelector("#totalGames").textContent = stats.total;
  document.querySelector("#stayRate").textContent = percentage(
    stats.stay.wins,
    stats.stay.plays
  );
  document.querySelector("#switchRate").textContent = percentage(
    stats.switch.wins,
    stats.switch.plays
  );
  document.querySelector("#stayDetail").textContent =
    `${stats.stay.wins}승 / ${stats.stay.plays}회`;
  document.querySelector("#switchDetail").textContent =
    `${stats.switch.wins}승 / ${stats.switch.plays}회`;
}

function runSimulation() {
  const count = Number(simulationCount.value);
  let stayWins = 0;
  let switchWins = 0;

  for (let i = 0; i < count; i += 1) {
    const car = randomDoor();
    const firstChoice = randomDoor();
    if (firstChoice === car) stayWins += 1;
    else switchWins += 1;
  }

  const stayRate = (stayWins / count) * 100;
  const switchRate = (switchWins / count) * 100;

  simulationResults.hidden = false;
  document.querySelector("#simStayRate").textContent = `${stayRate.toFixed(1)}%`;
  document.querySelector("#simSwitchRate").textContent = `${switchRate.toFixed(1)}%`;
  document.querySelector("#simStayDetail").textContent =
    `${count.toLocaleString("ko-KR")}회 중 ${stayWins.toLocaleString("ko-KR")}회 승리`;
  document.querySelector("#simSwitchDetail").textContent =
    `${count.toLocaleString("ko-KR")}회 중 ${switchWins.toLocaleString("ko-KR")}회 승리`;

  requestAnimationFrame(() => {
    document.querySelector("#stayBar").style.width = `${stayRate}%`;
    document.querySelector("#switchBar").style.width = `${switchRate}%`;
  });
}

doors.forEach((door) => {
  door.addEventListener("click", () => chooseDoor(Number(door.dataset.door)));
});
newGameButton.addEventListener("click", newGame);
stayButton.addEventListener("click", () => finishGame("stay"));
switchButton.addEventListener("click", () => finishGame("switch"));
resetStatsButton.addEventListener("click", () => {
  stats = defaultStats();
  saveStats();
  renderStats();
});
runSimulationButton.addEventListener("click", runSimulation);

renderStats();
newGame();
