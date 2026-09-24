import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/* ============================================================
 * 调色板（参考 Perler 拼豆常用颜色）
 * ============================================================ */
const PALETTE = [
  { name: "白色", hex: 0xf4f4f4 },
  { name: "米色", hex: 0xf7e7c9 },
  { name: "黄色", hex: 0xf8d41c },
  { name: "橙色", hex: 0xf77f00 },
  { name: "红色", hex: 0xda291c },
  { name: "粉红", hex: 0xf26ca7 },
  { name: "桃色", hex: 0xffb3a7 },
  { name: "紫色", hex: 0x7b4fa6 },
  { name: "品红", hex: 0xc5299b },
  { name: "天蓝", hex: 0x69c6e3 },
  { name: "蓝色", hex: 0x0057b8 },
  { name: "藏青", hex: 0x003087 },
  { name: "绿色", hex: 0x00a94f },
  { name: "深绿", hex: 0x046a38 },
  { name: "棕色", hex: 0x6b3e2e },
  { name: "浅棕", hex: 0xb07d4f },
  { name: "灰色", hex: 0x8e8e8e },
  { name: "深灰", hex: 0x4a4a4a },
  { name: "黑色", hex: 0x1a1a1a },
];

const STORAGE_KEY = "perler-beads-save";

/* ============================================================
 * 全局状态
 * ============================================================ */
let cols = 58;
let rows = 58;
let grid = []; // grid[r][c] = 调色板索引 或 -1
let currentColor = 11; // 默认蓝色
let tool = "paint"; // paint | erase | pick
let beadCount = 0;

/* ============================================================
 * Three.js 场景
 * ============================================================ */
const container = document.getElementById("canvas-container");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e2126);

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 10;
controls.maxDistance = 200;

// 灯光
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(30, 60, 30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
fillLight.position.set(-30, 40, -30);
scene.add(fillLight);

// 地面
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);

/* ============================================================
 * 画板与豆子（InstancedMesh 高性能渲染）
 * ============================================================ */
const BEAD_R = 0.42; // 豆子半径
const BEAD_H = 0.32; // 豆子高度
const PEG_H = 0.45; // 钉柱高度
const CELL = 1.0; // 格子间距

let boardGroup = null;
let beadMesh = null; // 豆身
let holeMesh = null; // 豆孔
let pegMesh = null; // 钉柱
let hoverMesh = null; // 悬停预览
let capacity = 0;

const beadGeo = new THREE.CylinderGeometry(BEAD_R, BEAD_R, BEAD_H, 20);
const holeGeo = new THREE.CircleGeometry(0.15, 16);
const pegGeo = new THREE.CylinderGeometry(0.09, 0.09, PEG_H, 8);
const hoverGeo = new THREE.CylinderGeometry(BEAD_R, BEAD_R, BEAD_H + 0.02, 20);

const tmpMatrix = new THREE.Matrix4();
const tmpColor = new THREE.Color();

function cellToWorld(r, c, y = 0) {
  return new THREE.Vector3(
    (c - cols / 2 + 0.5) * CELL,
    y,
    (r - rows / 2 + 0.5) * CELL
  );
}

function buildBoard() {
  if (boardGroup) {
    scene.remove(boardGroup);
    boardGroup.traverse((obj) => {
      if (obj.geometry && ![beadGeo, holeGeo, pegGeo].includes(obj.geometry)) {
        obj.geometry.dispose();
      }
      if (obj.material) obj.material.dispose();
    });
  }

  capacity = cols * rows;
  grid = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  beadCount = 0;

  boardGroup = new THREE.Group();
  scene.add(boardGroup);

  // 底板
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(cols * CELL + 2, 0.5, rows * CELL + 2),
    new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.8 })
  );
  base.position.y = -0.25;
  base.receiveShadow = true;
  base.castShadow = true;
  boardGroup.add(base);

  // 钉柱
  pegMesh = new THREE.InstancedMesh(
    pegGeo,
    new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.6 }),
    capacity
  );
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tmpMatrix.makeTranslation(0, PEG_H / 2, 0).setPosition(cellToWorld(r, c, PEG_H / 2));
      pegMesh.setMatrixAt(i++, tmpMatrix);
    }
  }
  pegMesh.castShadow = true;
  boardGroup.add(pegMesh);

  // 豆身
  beadMesh = new THREE.InstancedMesh(
    beadGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.05 }),
    capacity
  );
  beadMesh.count = 0;
  beadMesh.castShadow = true;
  beadMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  boardGroup.add(beadMesh);

  // 豆孔（统一深色，营造中孔效果）
  holeMesh = new THREE.InstancedMesh(
    holeGeo,
    new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 }),
    capacity
  );
  holeMesh.count = 0;
  holeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  boardGroup.add(holeMesh);

  // 悬停预览
  hoverMesh = new THREE.Mesh(
    hoverGeo,
    new THREE.MeshBasicMaterial({
      color: PALETTE[currentColor].hex,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
  );
  hoverMesh.visible = false;
  boardGroup.add(hoverMesh);

  fitCamera();
  updateStatus();
}

/* ---------- 豆子增删 ---------- */
function addBead(r, c, colorIdx) {
  if (grid[r][c] === colorIdx) return;
  if (grid[r][c] !== -1) {
    removeBead(r, c); // 已有豆子先移除再重建（数量少，简单可靠）
  }
  grid[r][c] = colorIdx;
  const y = PEG_H + BEAD_H / 2;
  const pos = cellToWorld(r, c, y);
  tmpMatrix.identity().setPosition(pos);
  const idx = beadMesh.count;
  beadMesh.setMatrixAt(idx, tmpMatrix);
  beadMesh.setColorAt(idx, tmpColor.setHex(PALETTE[colorIdx].hex));
  beadMesh.count++;

  tmpMatrix.makeRotationX(-Math.PI / 2).setPosition(pos.x, y + BEAD_H / 2 + 0.001, pos.z);
  holeMesh.setMatrixAt(idx, tmpMatrix);
  holeMesh.count++;

  beadMesh.instanceMatrix.needsUpdate = true;
  holeMesh.instanceMatrix.needsUpdate = true;
  if (beadMesh.instanceColor) beadMesh.instanceColor.needsUpdate = true;
  beadCount++;
}

function removeBead(r, c) {
  if (grid[r][c] === -1) return;
  grid[r][c] = -1;
  rebuildBeads();
}

function rebuildBeads() {
  let i = 0;
  beadCount = 0;
  const y = PEG_H + BEAD_H / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ci = grid[r][c];
      if (ci === -1) continue;
      const pos = cellToWorld(r, c, y);
      tmpMatrix.identity().setPosition(pos);
      beadMesh.setMatrixAt(i, tmpMatrix);
      beadMesh.setColorAt(i, tmpColor.setHex(PALETTE[ci].hex));
      tmpMatrix.makeRotationX(-Math.PI / 2).setPosition(pos.x, y + BEAD_H / 2 + 0.001, pos.z);
      holeMesh.setMatrixAt(i, tmpMatrix);
      i++;
      beadCount++;
    }
  }
  beadMesh.count = i;
  holeMesh.count = i;
  beadMesh.instanceMatrix.needsUpdate = true;
  holeMesh.instanceMatrix.needsUpdate = true;
  if (beadMesh.instanceColor) beadMesh.instanceColor.needsUpdate = true;
}

function fitCamera() {
  const size = Math.max(cols, rows);
  const dist = size * 1.1;
  camera.position.set(dist * 0.55, dist * 0.85, dist * 0.55);
  controls.target.set(0, 0, 0);
  camera.near = 0.1;
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
  controls.update();
}

/* ============================================================
 * 鼠标交互：射线拾取 + 拖动连画
 * ============================================================ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PEG_H);
const hitPoint = new THREE.Vector3();

let painting = false;
let eraseDrag = false;
let lastCell = null;

function getCell(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(boardPlane, hitPoint)) return null;
  const c = Math.floor(hitPoint.x / CELL + cols / 2);
  const r = Math.floor(hitPoint.z / CELL + rows / 2);
  if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
  return { r, c };
}

function paintLine(from, to) {
  // 两点间插值，拖动快速时不断线
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  for (let i = 0; i <= steps; i++) {
    const r = Math.round(from.r + (dr * i) / steps);
    const c = Math.round(from.c + (dc * i) / steps);
    if (eraseDrag || tool === "erase") {
      if (grid[r][c] !== -1) removeBead(r, c);
    } else {
      addBead(r, c, currentColor);
    }
  }
  updateStatus();
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  const cell = getCell(e);
  if (!cell) return;

  // 左键：按工具操作；右键：始终擦除
  if (e.button === 0) {
    if (tool === "pick") {
      if (grid[cell.r][cell.c] !== -1) {
        selectColor(grid[cell.r][cell.c]);
        setTool("paint");
      }
      return;
    }
    eraseDrag = tool === "erase";
  } else if (e.button === 2) {
    eraseDrag = true;
  } else {
    return;
  }

  painting = true;
  controls.enabled = false;
  lastCell = cell;
  paintLine(cell, cell);
});

renderer.domElement.addEventListener("pointermove", (e) => {
  const cell = getCell(e);

  // 悬停预览
  if (cell && !painting && (tool === "paint" || tool === "erase")) {
    hoverMesh.visible = true;
    const pos = cellToWorld(cell.r, cell.c, PEG_H + BEAD_H / 2);
    hoverMesh.position.copy(pos);
    hoverMesh.material.color.setHex(
      tool === "erase" ? 0xff4444 : PALETTE[currentColor].hex
    );
  } else {
    hoverMesh.visible = false;
  }

  if (painting && cell) {
    if (cell.r !== lastCell.r || cell.c !== lastCell.c) {
      paintLine(lastCell, cell);
      lastCell = cell;
    }
  }
});

window.addEventListener("pointerup", () => {
  painting = false;
  eraseDrag = false;
  controls.enabled = true;
});

renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

/* ============================================================
 * UI：调色板 / 工具 / 按钮
 * ============================================================ */
const paletteEl = document.getElementById("palette");
const curColorNameEl = document.getElementById("curColorName");
const beadCountEl = document.getElementById("beadCount");

PALETTE.forEach((p, i) => {
  const sw = document.createElement("div");
  sw.className = "swatch" + (i === currentColor ? " selected" : "");
  sw.style.background = "#" + p.hex.toString(16).padStart(6, "0");
  sw.title = p.name;
  sw.addEventListener("click", () => selectColor(i));
  paletteEl.appendChild(sw);
});

function selectColor(i) {
  currentColor = i;
  document.querySelectorAll(".swatch").forEach((el, idx) => {
    el.classList.toggle("selected", idx === i);
  });
  curColorNameEl.textContent = PALETTE[i].name;
  curColorNameEl.style.color = "#" + PALETTE[i].hex.toString(16).padStart(6, "0");
}

function setTool(t) {
  tool = t;
  ["toolPaint", "toolErase", "toolPick"].forEach((id) => {
    document.getElementById(id).classList.remove("active");
  });
  document.getElementById("tool" + t[0].toUpperCase() + t.slice(1)).classList.add("active");
}

document.getElementById("toolPaint").addEventListener("click", () => setTool("paint"));
document.getElementById("toolErase").addEventListener("click", () => setTool("erase"));
document.getElementById("toolPick").addEventListener("click", () => setTool("pick"));

document.getElementById("boardSize").addEventListener("change", (e) => {
  const n = parseInt(e.target.value, 10);
  if (beadCount > 0 && !confirm("切换画板尺寸会清空当前图案，确定吗？")) {
    e.target.value = String(cols);
    return;
  }
  cols = rows = n;
  buildBoard();
});

document.getElementById("btnClear").addEventListener("click", () => {
  if (beadCount === 0) return;
  if (confirm("确定清空整个画板吗？")) {
    grid = Array.from({ length: rows }, () => new Array(cols).fill(-1));
    rebuildBeads();
    updateStatus();
    toast("已清空 🗑️");
  }
});

function updateStatus() {
  beadCountEl.textContent = beadCount;
}

/* ---------- Toast ---------- */
let toastEl = document.getElementById("toast");
if (!toastEl) {
  toastEl = document.createElement("div");
  toastEl.id = "toast";
  document.body.appendChild(toastEl);
}
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

/* ============================================================
 * 导入图片 → 自动转拼豆图案
 * ============================================================ */
const fileInput = document.getElementById("fileInput");
document.getElementById("btnImport").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    // 按图片比例调整画板，最长边 58
    const MAX = 58;
    const ratio = img.width / img.height;
    if (ratio >= 1) {
      cols = MAX;
      rows = Math.max(1, Math.round(MAX / ratio));
    } else {
      rows = MAX;
      cols = Math.max(1, Math.round(MAX * ratio));
    }
    document.getElementById("boardSize").value = "58";
    buildBoard();

    const cv = document.createElement("canvas");
    cv.width = cols;
    cv.height = rows;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, cols, rows);

    const data = ctx.getImageData(0, 0, cols, rows).data;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4;
        const idx = nearestPalette(
          data[i],
          data[i + 1],
          data[i + 2],
          data[i + 3]
        );
        if (idx !== -1) addBead(r, c, idx);
      }
    }
    rebuildBeads();
    updateStatus();
    toast("图片转换完成 🎨");
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
  fileInput.value = "";
});

function nearestPalette(r, g, b, a) {
  if (a < 40) return -1; // 透明背景跳过
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE.length; i++) {
    const hex = PALETTE[i].hex;
    const pr = (hex >> 16) & 0xff;
    const pg = (hex >> 8) & 0xff;
    const pb = hex & 0xff;
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/* ============================================================
 * 导出 PNG（像素风拼豆图纸）
 * ============================================================ */
document.getElementById("btnExport").addEventListener("click", () => {
  const SCALE = 16;
  const cv = document.createElement("canvas");
  cv.width = cols * SCALE;
  cv.height = rows * SCALE;
  const ctx = cv.getContext("2d");

  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, cv.width, cv.height);

  const rad = SCALE * 0.46;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ci = grid[r][c];
      if (ci === -1) continue;
      const hex = "#" + PALETTE[ci].hex.toString(16).padStart(6, "0");
      const x = (c + 0.5) * SCALE;
      const y = (r + 0.5) * SCALE;

      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();

      // 中孔
      ctx.beginPath();
      ctx.arc(x, y, rad * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = "#f0f0f0";
      ctx.fill();
    }
  }

  cv.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `perler-beads-${cols}x${rows}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("PNG 已导出 📸");
  });
});

/* ============================================================
 * 保存 / 读取（localStorage）
 * ============================================================ */
document.getElementById("btnSave").addEventListener("click", () => {
  const data = {
    cols,
    rows,
    grid: grid.map((row) => row.join(",")).join(";"),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  toast("已保存到浏览器 💾");
});

document.getElementById("btnLoad").addEventListener("click", () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    toast("没有找到存档");
    return;
  }
  try {
    const data = JSON.parse(raw);
    cols = data.cols;
    rows = data.rows;
    document.getElementById("boardSize").value = "58";
    buildBoard();
    data.grid.split(";").forEach((line, r) => {
      if (r >= rows) return;
      line.split(",").forEach((v, c) => {
        if (c < cols && v !== "-1") addBead(r, c, parseInt(v, 10));
      });
    });
    rebuildBeads();
    updateStatus();
    toast("读取成功 📂");
  } catch {
    toast("存档损坏，无法读取");
  }
});

/* ============================================================
 * 启动
 * ============================================================ */
window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

selectColor(currentColor);
buildBoard();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
