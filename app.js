const apps = [
  {
    title: "곡선 속에 숨은 직선",
    subject: "수학",
    category: "미적분",
    description: "돋보기로 곡선을 점점 확대하며 Δx가 0에 가까워질 때 접선이 나타나는 과정을 발견하는 미분 도입 활동입니다.",
    tags: ["미분", "접선", "극한", "동기유발"],
    icon: "🔍",
    colors: ["#7664df", "#4b3da8"],
    subjectColors: ["#ece9ff", "#4d3daa"],
    url: "./apps/derivative-intro/index.html",
    date: "2026. 6. 23.",
  },
  {
    title: "몬티홀 실험실",
    subject: "수학",
    category: "확률",
    description: "문을 직접 고르고 선택 유지와 변경 전략의 승률을 비교하며 조건부확률의 직관을 확인하는 실험입니다.",
    tags: ["확률", "시뮬레이션", "게임", "통계"],
    icon: "🚪",
    colors: ["#3479b7", "#173f69"],
    subjectColors: ["#e5f1fb", "#245f91"],
    url: "./apps/monty-hall/index.html",
    date: "2026. 6. 23.",
  },
  {
    title: "삼각함수 탱크 대전",
    subject: "수학",
    category: "삼각함수",
    description: "모둠별 탱크가 삼각함수식을 입력해 미사일 궤적을 만들고 좌표, 그래프, 전략을 함께 탐구하는 활동입니다.",
    tags: ["삼각함수", "좌표평면", "그래프", "게임"],
    icon: "🎯",
    colors: ["#1f9d62", "#155f8a"],
    subjectColors: ["#e7f7ee", "#1f7a4c"],
    url: "./apps/trig-tank-game/index.html",
    date: "2026. 6. 25.",
  },
  {
    title: "극한 좀비 생존전",
    subject: "수학",
    category: "미적분",
    description: "좀비가 다가오기 전에 다항·유리·무리함수의 극한값을 계산하고 레벨별 점수를 모으는 생존형 연습 게임입니다.",
    tags: ["극한", "좌극한", "우극한", "무한대", "게임"],
    icon: "🧟",
    colors: ["#8d1f28", "#263238"],
    subjectColors: ["#ffe8e8", "#8d1f28"],
    url: "./apps/limit-zombie-game/index.html",
    date: "2026. 6. 27.",
  },
  {
    title: "퍼셉트론 손글씨 숫자 분류",
    subject: "인공지능 수학",
    category: "퍼셉트론",
    description: "학생이 직접 쓴 숫자를 10 x 10 이진 행렬로 바꾸고, 퍼셉트론의 가중치와 편향 변화를 보며 숫자를 분류하는 실습입니다.",
    tags: ["퍼셉트론", "이미지분류", "손글씨", "가중치", "편향"],
    icon: "✍️",
    colors: ["#147a7e", "#8c2f28"],
    subjectColors: ["#e3f4f3", "#0f6467"],
    url: "./apps/perceptron-handwriting-lab/index.html?v=20260706-phone-pdf-sheet",
    date: "2026. 7. 6.",
  },
];


const appGrid = document.querySelector("#appGrid");
const filters = document.querySelector("#filters");
const searchInput = document.querySelector("#searchInput");
const appCount = document.querySelector("#appCount");
const resultText = document.querySelector("#resultText");
const emptyState = document.querySelector("#emptyState");


let selectedCategory = "전체";


function categories() {
  return ["전체", ...new Set(apps.map((app) => app.category))];
}


function renderFilters() {
  filters.innerHTML = categories()
    .map(
      (category) => `
        <button class="filter-button ${category === selectedCategory ? "active" : ""}"
          type="button" data-category="${category}">${category}</button>
      `
    )
    .join("");


  filters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      renderFilters();
      renderApps();
    });
  });
}


function filteredApps() {
  const query = searchInput.value.trim().toLowerCase();
  return apps.filter((app) => {
    const categoryMatch =
      selectedCategory === "전체" || app.category === selectedCategory;
    const searchable = [
      app.title,
      app.subject,
      app.category,
      app.description,
      ...app.tags,
    ]
      .join(" ")
      .toLowerCase();
    return categoryMatch && (!query || searchable.includes(query));
  });
}


function renderApps() {
  const visibleApps = filteredApps();
  appGrid.innerHTML = visibleApps
    .map(
      (app, index) => `
        <article class="app-card">
          <div class="card-visual"
            style="background:linear-gradient(135deg,${app.colors[0]},${app.colors[1]})">
            <span class="card-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="visual-icon" aria-hidden="true">${app.icon}</span>
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span class="subject"
                style="color:${app.subjectColors[1]};background:${app.subjectColors[0]}">
                ${app.subject} · ${app.category}
              </span>
              <span class="date">${app.date}</span>
            </div>
            <h3>${app.title}</h3>
            <p>${app.description}</p>
            <div class="tags">${app.tags.map((tag) => `<span>#${tag}</span>`).join("")}</div>
            <a class="open-button" href="${app.url}"
              style="background:${app.colors[1]}">
              <span>활동 실행하기</span><span aria-hidden="true">→</span>
            </a>
          </div>
        </article>
      `
    )
    .join("");


  appGrid.hidden = visibleApps.length === 0;
  emptyState.hidden = visibleApps.length !== 0;
  resultText.textContent =
    visibleApps.length === apps.length
      ? "전체 앱을 보여드려요."
      : `${visibleApps.length}개의 앱을 찾았습니다.`;
}


searchInput.addEventListener("input", renderApps);
appCount.textContent = apps.length;
renderFilters();
renderApps();


