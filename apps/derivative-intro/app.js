const canvas = document.querySelector("#curveCanvas");
const ctx = canvas.getContext("2d");
const pointSlider = document.querySelector("#pointSlider");
const xValue = document.querySelector("#xValue");
const deltaValue = document.querySelector("#deltaValue");
const deltaFill = document.querySelector("#deltaFill");
const observation = document.querySelector("#observation");
const phaseLabel = document.querySelector("#phaseLabel");
const instruction = document.querySelector("#instruction");
const formula = document.querySelector("#formula");
const magicButton = document.querySelector("#magicButton");
const resetButton = document.querySelector("#resetButton");
const lensButtons = [...document.querySelectorAll(".lens-button")];

const levels = [
  {
    delta: 1.6,
    lensScale: 1,
    zoom: 1.15,
    text: "아직 곡선의 굽은 모습이 뚜렷하게 보여요.",
    phase: "관찰 1",
  },
  {
    delta: 0.55,
    lensScale: 0.78,
    zoom: 2.9,
    text: "곡선의 작은 부분이 조금 더 곧게 보이기 시작해요.",
    phase: "관찰 2",
  },
  {
    delta: 0.08,
    lensScale: 0.59,
    zoom: 9.2,
    text: "곡선이 직선에 아주 가까운 모습으로 보여요.",
    phase: "관찰 3",
  },
  {
    delta: 0.01,
    lensScale: 0.43,
    zoom: 24,
    text: "이제 곡선이 사실상 하나의 직선처럼 보여요!",
    phase: "관찰 4",
  },
];

let selectedLevel = 0;
let t = Number(pointSlider.value);
let tangentVisible = false;
let animating = false;
let dpr = 1;
let width = 0;
let height = 0;

function curveValue(u) {
  return (
    0.18 * Math.sin(u * Math.PI * 2.15 + 0.35) +
    0.085 * Math.sin(u * Math.PI * 5.1 - 0.4) +
    0.51
  );
}

function curveSlope(u) {
  return (
    0.18 * Math.PI * 2.15 * Math.cos(u * Math.PI * 2.15 + 0.35) +
    0.085 * Math.PI * 5.1 * Math.cos(u * Math.PI * 5.1 - 0.4)
  );
}

function toPoint(u) {
  const padX = width * 0.075;
  const graphWidth = width - padX * 2;
  const graphTop = height * 0.12;
  const graphHeight = height * 0.72;
  return {
    x: padX + u * graphWidth,
    y: graphTop + curveValue(u) * graphHeight,
  };
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function drawCurve(context, color, lineWidth) {
  context.beginPath();
  for (let i = 0; i <= 500; i += 1) {
    const p = toPoint(i / 500);
    if (i === 0) context.moveTo(p.x, p.y);
    else context.lineTo(p.x, p.y);
  }
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
}

function drawAxes() {
  ctx.save();
  ctx.strokeStyle = "rgba(24,36,59,.14)";
  ctx.lineWidth = 1;
  const centerY = height * .82;
  ctx.beginPath();
  ctx.moveTo(width * .055, centerY);
  ctx.lineTo(width * .945, centerY);
  ctx.stroke();
  ctx.fillStyle = "rgba(24,36,59,.5)";
  ctx.font = "700 12px system-ui";
  ctx.fillText("x", width * .94, centerY - 10);
  ctx.restore();
}

function drawTangent(point, alpha = 1) {
  const graphWidth = width * .85;
  const graphHeight = height * .72;
  const pixelSlope = curveSlope(t) * graphHeight / graphWidth;
  const span = Math.min(width * .34, 330);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(point.x - span, point.y - pixelSlope * span);
  ctx.lineTo(point.x + span, point.y + pixelSlope * span);
  ctx.strokeStyle = "#ff735e";
  ctx.lineWidth = 4;
  ctx.setLineDash([11, 8]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#c64250";
  ctx.font = "900 14px system-ui";
  ctx.fillText("접선", point.x + span * .62, point.y + pixelSlope * span * .62 - 14);
  ctx.restore();
}

function drawLens(point) {
  const level = levels[selectedLevel];
  const baseRadius = Math.min(width, height) * .215;
  const radius = baseRadius * level.lensScale;
  const lensX = point.x;
  const lensY = point.y;

  ctx.save();
  ctx.beginPath();
  ctx.arc(lensX, lensY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.fillRect(lensX - radius, lensY - radius, radius * 2, radius * 2);

  const zoom = level.zoom;
  ctx.translate(lensX, lensY);
  ctx.scale(zoom, zoom);
  ctx.translate(-point.x, -point.y);
  drawCurve(ctx, "#322580", Math.max(3 / zoom, 1.2));

  if (tangentVisible) {
    const graphWidth = width * .85;
    const graphHeight = height * .72;
    const pixelSlope = curveSlope(t) * graphHeight / graphWidth;
    const span = width;
    ctx.beginPath();
    ctx.moveTo(point.x - span, point.y - pixelSlope * span);
    ctx.lineTo(point.x + span, point.y + pixelSlope * span);
    ctx.strokeStyle = "#ff735e";
    ctx.lineWidth = Math.max(3 / zoom, .8);
    ctx.stroke();
  }
  ctx.restore();

  const gradient = ctx.createLinearGradient(
    lensX - radius,
    lensY - radius,
    lensX + radius,
    lensY + radius
  );
  gradient.addColorStop(0, "#8e7cff");
  gradient.addColorStop(.55, "#4c3bb9");
  gradient.addColorStop(1, "#30247e");

  ctx.save();
  ctx.beginPath();
  ctx.arc(lensX, lensY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = Math.max(8, radius * .075);
  ctx.shadowColor = "rgba(45,32,120,.28)";
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const handleAngle = Math.PI * .27;
  const innerX = lensX + Math.cos(handleAngle) * (radius + 2);
  const innerY = lensY + Math.sin(handleAngle) * (radius + 2);
  const handleLength = radius * .63;
  ctx.beginPath();
  ctx.moveTo(innerX, innerY);
  ctx.lineTo(
    innerX + Math.cos(handleAngle) * handleLength,
    innerY + Math.sin(handleAngle) * handleLength
  );
  ctx.strokeStyle = "#30247e";
  ctx.lineWidth = Math.max(13, radius * .13);
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(lensX - radius * .34, lensY - radius * .38, radius * .14, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,.52)";
  ctx.fill();
  ctx.restore();
}

function drawPoint(point) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,115,94,.16)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#ff735e";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#18243b";
  ctx.font = "900 13px system-ui";
  ctx.fillText("P", point.x + 13, point.y - 12);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  drawAxes();
  drawCurve(ctx, "#6854d9", 5);
  const point = toPoint(t);
  if (tangentVisible) drawTangent(point);
  drawLens(point);
  drawPoint(point);
}

function setLevel(level, options = {}) {
  selectedLevel = level;
  const data = levels[level];
  lensButtons.forEach((button, index) => {
    button.classList.toggle("active", index === level);
  });
  deltaValue.textContent = `Δx = ${data.delta.toFixed(2)}`;
  deltaFill.style.width = `${[100, 34, 7, 1.5][level]}%`;
  observation.textContent = data.text;
  phaseLabel.textContent = data.phase;
  instruction.textContent =
    level >= 2
      ? "한 점에 가까운 아주 작은 구간의 모양을 관찰해 보세요."
      : "돋보기를 바꾸며 곡선의 모양을 비교해 보세요.";
  if (!options.keepTangent) {
    tangentVisible = false;
    formula.classList.remove("show");
  }
  draw();
}

function setPoint(value) {
  t = Math.min(.92, Math.max(.08, value));
  pointSlider.value = t;
  xValue.textContent = `x = ${((t - .5) * 8).toFixed(2)}`;
  draw();
}

function pointFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const padX = width * .075;
  return (x - padX) / (width - padX * 2);
}

function revealTangent() {
  if (animating) return;
  animating = true;
  tangentVisible = false;
  formula.classList.remove("show");
  let level = selectedLevel;

  const advance = () => {
    setLevel(level, { keepTangent: true });
    if (level < levels.length - 1) {
      level += 1;
      window.setTimeout(advance, 750);
    } else {
      window.setTimeout(() => {
        tangentVisible = true;
        formula.classList.add("show");
        instruction.textContent = "곡선과 접선이 한 점 P에서 같은 방향을 가집니다.";
        phaseLabel.textContent = "발견!";
        draw();
        animating = false;
      }, 700);
    }
  };
  advance();
}

pointSlider.addEventListener("input", (event) => setPoint(Number(event.target.value)));
lensButtons.forEach((button) => {
  button.addEventListener("click", () => setLevel(Number(button.dataset.level)));
});
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  setPoint(pointFromPointer(event));
});
canvas.addEventListener("pointermove", (event) => {
  if (canvas.hasPointerCapture(event.pointerId)) setPoint(pointFromPointer(event));
});
magicButton.addEventListener("click", revealTangent);
resetButton.addEventListener("click", () => {
  animating = false;
  tangentVisible = false;
  formula.classList.remove("show");
  setPoint(.4);
  setLevel(0);
});

window.addEventListener("resize", resize);
resize();
