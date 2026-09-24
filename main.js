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
  { name: "珊瑚橙", hex: 0xd97757 }, // Claude 品牌色
];

/* ============================================================
 * 内置模板：字符画 → 调色板索引（. 表示空）
 * ============================================================ */
const CHAR_MAP = {
  W: 0, C: 19, Y: 2, O: 3, R: 4, P: 5, T: 6, V: 7, M: 8,
  S: 9, B: 10, N: 11, G: 12, D: 13, E: 14, L: 15, A: 16, H: 17, K: 18,
};

const TEMPLATES = [
  {
    name: "🟠 Claude 标志",
    art: [
      "...KKKKKKKK...",
      ".KCCCCCCCCCCK.",
      "KCCCCCCCCCCCCK",
      "KCCCCKKKKCCCCK",
      "KCCCKKKKKKCCCK",
      "KCCCCKKKKCCCCK",
      "KCCCCCKKCCCCCK",
      "KCCCCCCCCCCCCK",
      ".KCCCCCCCCCCK.",
      "...KKKKKKKK...",
    ],
  },
  {
    name: "😊 Claude 小精灵",
    art: [
      "......KWK.....",
      "....KKKKKK....",
      "..KKCCCCCCKK..",
      ".KCCCCCCCCCCK.",
      ".KCCKKCCCKKCC.",
      ".KCPCCCCCCPCC.",
      ".KCCCKKKKCCCK.",
      ".KCCCCCCCCCCK.",
      "..KCCCCCCCCK..",
      "....KKKKKK....",
    ],
  },
  {
    name: "❤️ 爱心",
    art: [
      ".KK....KK.",
      "KRRK..KRRK",
      "KRRKKKKRRK",
      "KRRRRRRRRK",
      ".KRRRRRRK.",
      "..KRRRRK..",
      "...KRRK...",
      "....KK....",
    ],
  },
  {
    name: "⭐ 星星",
    art: [
      "....K....",
      "...KYK...",
      "KKKKYKKKK",
      "KYYYYYYYK",
      ".KYYYYYK.",
      "..KYKYK..",
      ".KYK.KYK.",
      "KYK...KYK",
    ],
  },
  {
    name: "👾 太空侵略者",
    art: [
      "..K.....K..",
      "...K...K...",
      "..KKKKKKK..",
      ".KK.KKK.KK.",
      "KKKKKKKKKKK",
      "K.KKKKKKK.K",
      "K.K.....K.K",
      "...KK.KK...",
    ],
  },
  {
    name: "🍄 蘑菇",
    art: [
      "...KKKKKK...",
      ".KKRRRRRRKK.",
      "KRRWWRRWWRRK",
      "KRRRRRRRRRRK",
      ".KRRWWWWRRK.",
      "..KKKKKKKK..",
      ".KWWWWWWWWK.",
      "KWWKWWWWKWWK",
      "KWWKWWWWKWWK",
      "KWWWWKKWWWWK",
      ".KWWWWWWWWK.",
      "..KKKKKKKK..",
    ],
  },
  {
    name: "🌈 彩虹",
    art: [
      ".....YYYYY.....",
      "....OOOOOOO....",
      "...RRRRRRRRR...",
      "..MMMMMMMMMMM..",
      ".VVVVVVVVVVVVV.",
      ".KSSSSSSSSSSSK.",
      "..K.........K..",
      ".WWK.......KWW.",
      "WWWK.......KWWW",
    ],
  },
  {
    name: "👻 小幽灵",
    art: [
      "..KKKKKKKK..",
      ".KRRRRRRRRK.",
      "KRRRRRRRRRRK",
      "KWWKRRRRKWWK",
      "KWNKRRRRKNWK",
      "KRRRRRRRRRRK",
      "KRRRRRRRRRRK",
      "KRRRKRRKRRRK",
    ],
  },
  {
    name: "🌸 花朵",
    art: [
      "......PPP......",
      "....PPPPPPP....",
      "..PPPPPPPPPPP..",
      ".PPPPTTTTTPPPP.",
      "PPPPTYYYYTPPPPP",
      "PPPPTYYYYTPPPPP",
      ".PPPPTTTTTPPPP.",
      "..PPPPPPPPPPP..",
      "....PPPPPPP....",
      "......PPP......",
      ".......G.......",
      "..GG...G...GG..",
      ".......G.......",
      ".......G.......",
      ".......G.......",
    ],
  },
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
renderer.domElement.style.cursor = "none"; // 用 3D 夹子代替系统光标

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 10;
controls.maxDistance = 200;
// 中键旋转、右键平移；左键完全留给放豆
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: THREE.MOUSE.ROTATE,
  RIGHT: THREE.MOUSE.PAN,
};

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

// 木纹桌面（程序化生成贴图）
function makeWoodTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#9c6b3d";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 48; i++) {
    ctx.strokeStyle = `rgba(58, 34, 14, ${0.04 + Math.random() * 0.09})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 4 + (Math.random() - 0.5) * 3);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const table = new THREE.Mesh(
  new THREE.BoxGeometry(400, 2, 400),
  new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.75 })
);
table.position.y = -1.5; // 桌面在 y = -0.5
table.receiveShadow = true;
scene.add(table);

// 桌上的一支铅笔
function makePencil() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf4c542, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8, 6), yellow);
  const tipWood = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1, 6),
    new THREE.MeshStandardMaterial({ color: 0xd9b38c, roughness: 0.85 })
  );
  tipWood.position.y = -4.5;
  tipWood.rotation.x = Math.PI;
  const tipLead = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 })
  );
  tipLead.position.y = -5.2;
  tipLead.rotation.x = Math.PI;
  const eraser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0xf26ca7, roughness: 0.8 })
  );
  eraser.position.y = 4.4;
  g.add(body, tipWood, tipLead, eraser);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

const pencil = makePencil();
pencil.rotation.z = Math.PI / 2; // 平放
pencil.rotation.y = 0.6;
pencil.position.set(-cols / 2 - 14, -0.15, rows / 2 + 8);
scene.add(pencil);

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
const holeGeo = new THREE.RingGeometry(0.095, 0.16, 16); // 中孔圆环，能看到穿过的钉柱
const pegGeo = new THREE.CylinderGeometry(0.09, 0.09, PEG_H + 0.22, 8); // 钉柱穿过豆孔
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
      tmpMatrix
        .makeTranslation(0, (PEG_H + 0.22) / 2, 0)
        .setPosition(cellToWorld(r, c, (PEG_H + 0.22) / 2));
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
  layoutBowls();
  updateStatus();
}

/* ---------- 豆子增删 ---------- */
function addBead(r, c, colorIdx) {
  if (grid[r][c] === colorIdx) return;
  if (grid[r][c] !== -1) {
    removeBead(r, c); // 已有豆子先移除再重建（数量少，简单可靠）
  }
  grid[r][c] = colorIdx;
  const idx = beadMesh.count;
  beadMesh.count++;
  holeMesh.count++;
  beadMesh.setColorAt(idx, tmpColor.setHex(PALETTE[colorIdx].hex));
  if (beadMesh.instanceColor) beadMesh.instanceColor.needsUpdate = true;

  const landY = PEG_H + BEAD_H / 2;
  if (falling.length < MAX_FALLING) {
    // 从夹子尖落下，带重力和落地压扁动画
    heldBead.getWorldPosition(tipWorld);
    const target = cellToWorld(r, c, 0);
    falling.push({
      idx, r, c,
      x: tipWorld.x, z: tipWorld.z,
      y: Math.max(tipWorld.y, landY + 0.9),
      tx: target.x, tz: target.z,
      vy: -1, landY, landed: false, squashT: 0,
    });
  } else {
    // 超量（批量导入）直接落定
    const pos = cellToWorld(r, c, landY);
    tmpMatrix.identity().setPosition(pos);
    beadMesh.setMatrixAt(idx, tmpMatrix);
    tmpMatrix.makeRotationX(-Math.PI / 2).setPosition(pos.x, landY + BEAD_H / 2 + 0.001, pos.z);
    holeMesh.setMatrixAt(idx, tmpMatrix);
  }
  beadCount++;
}

function removeBead(r, c) {
  if (grid[r][c] === -1) return;
  grid[r][c] = -1;
  rebuildBeads();
}

function rebuildBeads() {
  falling.length = 0; // 飞行中的豆子直接由下面的循环落定
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
 * 3D 夹子光标 + 落豆动画 + 合成音效
 * ============================================================ */
const cursorRig = new THREE.Group();
scene.add(cursorRig);
const tweezerMetal = new THREE.MeshStandardMaterial({ color: 0xaab2bc, metalness: 0.85, roughness: 0.35 });
// 上段：微张的直臂，拼豆就堆在上面
const upperArmGeo = new THREE.BoxGeometry(0.09, 1.8, 0.3);
upperArmGeo.translate(0, -0.9, 0);
// 下段：向内弯的夹尖
const tipArmGeo = new THREE.BoxGeometry(0.09, 0.75, 0.3);
tipArmGeo.translate(0, -0.375, 0);

function makeArm(sign) {
  const arm = new THREE.Group();
  arm.rotation.z = sign * 0.42;
  const upper = new THREE.Mesh(upperArmGeo, tweezerMetal);
  const tip = new THREE.Mesh(tipArmGeo, tweezerMetal);
  tip.position.y = -1.8;
  tip.rotation.z = -sign * 0.9; // 夹尖向内收拢，夹住豆子
  upper.castShadow = tip.castShadow = true;
  arm.add(upper, tip);
  return arm;
}
const armL = makeArm(1);
const armR = makeArm(-1);
const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.36), tweezerMetal);
bridge.castShadow = true;
cursorRig.add(armL, armR, bridge);

// 夹着的拼豆
const heldBead = new THREE.Group();
const heldBody = new THREE.Mesh(beadGeo, new THREE.MeshStandardMaterial({ roughness: 0.35 }));
const heldHole = new THREE.Mesh(holeGeo, new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 }));
heldHole.rotation.x = -Math.PI / 2;
heldHole.position.y = BEAD_H / 2 + 0.001;
heldBead.add(heldBody, heldHole);
heldBead.position.y = -2.42; // 豆子被夹在镊子尖
cursorRig.add(heldBead);
cursorRig.visible = false;

/* 镊子两臂上堆着的拼豆：放豆时逐颗滑向尖端，用完要去碗里夹 */
const STACK_N = 3;
const STACK_GAP = 0.36;
const STACK_TOP = -1.05;
const stackBodyMat = new THREE.MeshStandardMaterial({ roughness: 0.35 });
const stackHoleMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 });

function makeStackBead() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(beadGeo, stackBodyMat);
  const hole = new THREE.Mesh(holeGeo, stackHoleMat);
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = BEAD_H / 2 + 0.001;
  g.add(body, hole);
  return g;
}

const stacks = {
  L: { arm: armL, beads: [], anims: [] },
  R: { arm: armR, beads: [], anims: [] },
};
for (const key of ["L", "R"]) {
  for (let i = 0; i < STACK_N; i++) {
    const b = makeStackBead();
    b.position.y = STACK_TOP - i * STACK_GAP;
    stacks[key].arm.add(b);
    stacks[key].beads.push(b);
  }
}
let supplyArm = 0;
let grabState = null; // 去碗里夹豆的状态机

const easeOutQuad = (p) => 1 - (1 - p) * (1 - p);

function stackTotal() {
  return stacks.L.beads.length + stacks.R.beads.length;
}

function clearStacks() {
  for (const key of ["L", "R"]) {
    const s = stacks[key];
    s.anims.length = 0;
    s.beads.forEach((b) => b.parent && b.parent.remove(b));
    s.beads.length = 0;
  }
}

// 从碗里夹一撮豆（2~5 颗）到镊子两臂
function refillStacks(total) {
  let arm = 0;
  for (let n = 0; n < total; n++) {
    const key = arm++ % 2 === 0 ? "L" : "R";
    const stack = stacks[key];
    if (stack.beads.length >= STACK_N) continue;
    const nb = makeStackBead();
    nb.position.y = STACK_TOP - stack.beads.length * STACK_GAP;
    nb.scale.setScalar(0.01);
    stack.arm.add(nb);
    stack.beads.unshift(nb);
    stack.anims.push({ bead: nb, type: "in", t: 0, delay: n * 0.06 });
  }
}

function supplyBead() {
  const key = supplyArm++ % 2 === 0 ? "L" : "R";
  const stack = stacks[key];
  if (!stack || stack.anims.length > 0) return; // 该臂正在动画
  if (stack.beads.length === 0) return;
  // 底部豆滑向尖端并消失（它就是要放下的那颗）
  const bottom = stack.beads.pop();
  stack.anims.push({ bead: bottom, type: "out", t: 0, delay: 0, fromY: bottom.position.y });
  // 其余豆下滑一格
  stack.beads.forEach((b, i) => {
    stack.anims.push({ bead: b, type: "slide", t: 0, delay: 0, fromY: b.position.y, toY: STACK_TOP - i * STACK_GAP });
  });
}

function updateStacks(dt) {
  for (const key of ["L", "R"]) {
    const stack = stacks[key];
    for (let i = stack.anims.length - 1; i >= 0; i--) {
      const a = stack.anims[i];
      if (a.delay > 0) {
        a.delay -= dt;
        continue;
      }
      a.t += dt;
      const p = Math.min(1, a.t / 0.13);
      if (a.type === "out") {
        a.bead.position.y = THREE.MathUtils.lerp(a.fromY, -2.4, easeOutQuad(p));
        a.bead.scale.setScalar(1 - p * p);
        if (p >= 1) {
          a.bead.parent.remove(a.bead);
          stack.anims.splice(i, 1);
        }
      } else if (a.type === "slide") {
        a.bead.position.y = THREE.MathUtils.lerp(a.fromY, a.toY, easeOutQuad(p));
        if (p >= 1) stack.anims.splice(i, 1);
      } else {
        a.bead.scale.setScalar(Math.max(0.01, easeOutQuad(p)));
        if (p >= 1) stack.anims.splice(i, 1);
      }
    }
  }
}

/* ---------- 拼豆碗：桌上的 3D 调色盘，点击用镊子去夹豆 ---------- */
const BOWL_BEADS = 12;
const bowlGeo = new THREE.LatheGeometry(
  [
    new THREE.Vector2(0.01, 0.04),
    new THREE.Vector2(0.9, 0.08),
    new THREE.Vector2(1.6, 0.3),
    new THREE.Vector2(2.05, 0.75),
    new THREE.Vector2(2.3, 1.25),
  ],
  28
);
const bowlMat = new THREE.MeshStandardMaterial({ color: 0xe8e4de, roughness: 0.5, side: THREE.DoubleSide });
const pileMat = new THREE.MeshStandardMaterial({ roughness: 0.35 });
const bowls = [];

for (let i = 0; i < PALETTE.length; i++) {
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.userData.colorIdx = i;
  bowl.castShadow = true;
  bowl.position.y = -0.55; // 碗底贴桌面
  scene.add(bowl);
  bowls.push(bowl);

  // 碗里的一堆豆
  const pile = new THREE.InstancedMesh(beadGeo, pileMat, BOWL_BEADS);
  pile.castShadow = true;
  for (let j = 0; j < BOWL_BEADS; j++) {
    const ang = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * 1.6;
    const y = 0.08 + (rr / 1.9) ** 2 * 0.22 + Math.random() * 0.1;
    tmpMatrix.makeRotationY(Math.random() * Math.PI).setPosition(Math.cos(ang) * rr, y, Math.sin(ang) * rr);
    pile.setMatrixAt(j, tmpMatrix);
    pile.setColorAt(j, tmpColor.setHex(PALETTE[i].hex));
  }
  bowl.add(pile);
}

function layoutBowls() {
  const perRow = 10;
  const gap = 5.4;
  const z0 = -(rows / 2 + 8);
  for (let i = 0; i < bowls.length; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    bowls[i].position.set((col - (perRow - 1) / 2) * gap, -0.55, z0 - row * 5.6);
  }
}

// 镊子飞去碗里夹一撮豆；cell 为要补放的目标格（可为空）
function startGrab(bowlPos, cell) {
  grabState = {
    phase: "move",
    t: 0,
    bowl: bowlPos.clone(),
    cell: cell || null,
    total: 2 + Math.floor(Math.random() * 4), // 一次夹 2~5 颗
  };
  pressing = false;
}

// 指针追踪（窗口级，即使移出画布也保持）
const pointerNdc = new THREE.Vector2(0, 0);
let pointerInCanvas = false;
let pointerOverBoard = false;
let pressing = false;
window.addEventListener("pointermove", (e) => {
  pointerNdc.set(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
});
renderer.domElement.addEventListener("pointerenter", () => (pointerInCanvas = true));
renderer.domElement.addEventListener("pointerleave", () => {
  pointerInCanvas = false;
  pointerOverBoard = false;
});

const rigTarget = new THREE.Vector3();
const rigPos = new THREE.Vector3(0, 4.8, 0);
const zeroPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const tipWorld = new THREE.Vector3();

let pressPitch = 0; // 按下时的前倾角度

function updateCursorRig(dt) {
  raycaster.setFromCamera(pointerNdc, camera);
  if (raycaster.ray.intersectPlane(zeroPlane, rigTarget)) {
    const bx = cols / 2 + 3;
    const bz = rows / 2 + 3;
    rigTarget.x = THREE.MathUtils.clamp(rigTarget.x, -bx, bx);
    rigTarget.z = THREE.MathUtils.clamp(rigTarget.z, -bz, bz);
  }

  let tx = rigTarget.x;
  let tz = rigTarget.z;
  let targetY = pressing ? 3.2 : 4.8;
  let pitchTarget = pressing ? 0.32 : 0; // 按下时前倾，像手放下去

  // 去碗里夹豆的状态机
  if (grabState) {
    grabState.t += dt;
    if (grabState.phase === "move") {
      tx = grabState.bowl.x;
      tz = grabState.bowl.z;
      targetY = 4.8;
      if (grabState.t > 0.3) {
        grabState.phase = "dip";
        grabState.t = 0;
      }
    } else if (grabState.phase === "dip") {
      tx = grabState.bowl.x;
      tz = grabState.bowl.z;
      targetY = 3.6; // 探进碗里
      pitchTarget = 0.5;
      if (grabState.t > 0.25) {
        refillStacks(grabState.total);
        if (audioCtx) blip(500, 140, 0.12, 0.1); // 舀豆 噗
        grabState.phase = "lift";
        grabState.t = 0;
      }
    } else {
      if (grabState.t > 0.22) {
        const cell = grabState.cell;
        grabState = null;
        if (cell) paintLine(cell, cell); // 补放刚才那一下
      }
    }
  }

  rigPos.y += (targetY - rigPos.y) * Math.min(1, dt * 12);

  const k = Math.min(1, dt * (grabState && grabState.phase === "move" ? 5 : 9));
  const prevX = rigPos.x;
  const prevZ = rigPos.z;
  rigPos.x += (tx - rigPos.x) * k;
  rigPos.z += (tz - rigPos.z) * k;
  cursorRig.position.copy(rigPos);

  pressPitch += (pitchTarget - pressPitch) * Math.min(1, dt * 10);

  // 移动时轻微倾斜，更有手感
  const vx = (rigPos.x - prevX) / Math.max(dt, 1e-4);
  const vz = (rigPos.z - prevZ) / Math.max(dt, 1e-4);
  const tiltZ = THREE.MathUtils.clamp(-vx * 0.02, -0.3, 0.3);
  const tiltX = THREE.MathUtils.clamp(vz * 0.02, -0.3, 0.3);
  const k2 = Math.min(1, dt * 8);
  cursorRig.rotation.z += (tiltZ - cursorRig.rotation.z) * k2;
  cursorRig.rotation.x += (tiltX + pressPitch - cursorRig.rotation.x) * k2;

  const showRig = pointerInCanvas && tool !== "pick";
  cursorRig.visible = showRig;
  heldBead.visible = showRig && tool === "paint" && !pressing && !grabState;
  heldBody.material.color.setHex(PALETTE[currentColor].hex);
  stackBodyMat.color.setHex(PALETTE[currentColor].hex);
}

/* ---------- 落豆动画（重力 + 落地压扁） ---------- */
const falling = [];
const GRAV = 70;
const MAX_FALLING = 120;

function updateFalling(dt) {
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    if (!f.landed) {
      f.vy -= GRAV * dt;
      f.y += f.vy * dt;
      // 水平滑向目标格
      const kh = Math.min(1, dt * 10);
      f.x += (f.tx - f.x) * kh;
      f.z += (f.tz - f.z) * kh;
      if (f.y <= f.landY) {
        f.y = f.landY;
        f.landed = true;
        maybePlaceSound(); // 哒！
      }
    } else {
      f.squashT += dt;
    }
    const t = Math.min(1, f.squashT / 0.15);
    const s = f.landed ? Math.sin(t * Math.PI) : 0;
    const sxz = 1 + s * 0.2;
    const sy = 1 - s * 0.28;
    tmpMatrix.makeScale(sxz, sy, sxz).setPosition(f.x, f.y, f.z);
    beadMesh.setMatrixAt(f.idx, tmpMatrix);
    tmpMatrix
      .makeRotationX(-Math.PI / 2)
      .scale(new THREE.Vector3(sxz, sxz, 1));
    tmpMatrix.setPosition(f.x, f.y + (BEAD_H / 2) * sy + 0.001, f.z);
    holeMesh.setMatrixAt(f.idx, tmpMatrix);

    if (f.landed && f.squashT >= 0.15) {
      const pos = cellToWorld(f.r, f.c, f.landY);
      tmpMatrix.identity().setPosition(pos);
      beadMesh.setMatrixAt(f.idx, tmpMatrix);
      tmpMatrix.makeRotationX(-Math.PI / 2).setPosition(pos.x, f.landY + BEAD_H / 2 + 0.001, pos.z);
      holeMesh.setMatrixAt(f.idx, tmpMatrix);
      falling.splice(i, 1);
    }
  }
  if (falling.length) {
    beadMesh.instanceMatrix.needsUpdate = true;
    holeMesh.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- 音效（WebAudio 合成，无外部资源） ---------- */
let audioCtx = null;
let soundOn = true;
let lastPlaceSound = 0;
let lastEraseSound = 0;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function blip(f0, f1, dur, vol, type = "sine") {
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function maybePlaceSound() {
  if (!soundOn || !audioCtx) return;
  const now = performance.now();
  if (now - lastPlaceSound < 55) return;
  lastPlaceSound = now;
  blip(1500 + Math.random() * 500, 900, 0.035, 0.05, "square"); // 哒！
  blip(320, 110, 0.09, 0.15); // 落地的闷响
}

function maybeEraseSound() {
  if (!soundOn || !audioCtx) return;
  const now = performance.now();
  if (now - lastEraseSound < 70) return;
  lastEraseSound = now;
  blip(480, 160, 0.07, 0.09); // 啵
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
  let erased = false;
  for (let i = 0; i <= steps; i++) {
    const r = Math.round(from.r + (dr * i) / steps);
    const c = Math.round(from.c + (dc * i) / steps);
    if (eraseDrag || tool === "erase") {
      if (grid[r][c] !== -1) {
        removeBead(r, c);
        erased = true;
      }
    } else {
      addBead(r, c, currentColor);
      supplyBead(); // 镊子上一颗豆滑向尖端
    }
  }
  if (erased) maybeEraseSound();
  updateStatus();
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  const cell = getCell(e); // 顺便给 raycaster 上了指针

  // 点到拼豆碗：换色，并让镊子去碗里夹一撮豆
  const bowlHits = raycaster.intersectObjects(bowls);
  if (bowlHits.length) {
    ensureAudio();
    const idx = bowlHits[0].object.userData.colorIdx;
    if (idx !== currentColor) selectColor(idx);
    if (!grabState && stackTotal() < STACK_N * 2) {
      startGrab(bowlHits[0].object.position, null);
    }
    return;
  }

  if (!cell) return;
  ensureAudio();

  // 左键：按工具操作；右键：始终擦除
  if (e.button === 0) {
    if (tool === "pick") {
      if (grid[cell.r][cell.c] !== -1) {
        selectColor(grid[cell.r][cell.c]);
        setTool("paint");
      }
      return;
    }
    if (tool === "erase") {
      eraseDrag = true;
    } else if (stackTotal() === 0 && !grabState) {
      // 镊子上没豆了：先去碗里夹一撮，回来补放这一下
      startGrab(bowls[currentColor].position, cell);
      return;
    }
  } else if (e.button === 2) {
    eraseDrag = true;
  } else {
    return;
  }

  pressing = true;
  painting = true;
  controls.enabled = false;
  lastCell = cell;
  paintLine(cell, cell);
});

renderer.domElement.addEventListener("pointermove", (e) => {
  const cell = getCell(e);
  pointerOverBoard = !!cell;

  // 悬停预览（擦除时显示红色；放豆时由夹着的豆子预览）
  if (cell && !painting && tool === "erase") {
    hoverMesh.visible = true;
    hoverMesh.position.copy(cellToWorld(cell.r, cell.c, PEG_H + BEAD_H / 2));
    hoverMesh.material.color.setHex(0xff4444);
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
  pressing = false;
  controls.enabled = true;
});

window.addEventListener("blur", () => {
  painting = false;
  eraseDrag = false;
  pressing = false;
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
  if (i !== currentColor) clearStacks(); // 换色 = 倒掉镊子上的豆，去碗里重新夹
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

document.getElementById("btnSound").addEventListener("click", (e) => {
  soundOn = !soundOn;
  e.currentTarget.textContent = soundOn ? "🔊" : "🔇";
  if (soundOn) ensureAudio();
});

document.getElementById("boardSize").addEventListener("change", (e) => {
  if (e.target.value === "custom") {
    document.getElementById("customSize").hidden = false;
    return;
  }
  document.getElementById("customSize").hidden = true;
  const n = parseInt(e.target.value, 10);
  if (beadCount > 0 && !confirm("切换画板尺寸会清空当前图案，确定吗？")) {
    e.target.value = String(cols);
    return;
  }
  cols = rows = n;
  buildBoard();
});

document.getElementById("btnApplySize").addEventListener("click", () => {
  const w = Math.min(150, Math.max(5, parseInt(document.getElementById("customW").value, 10) || 29));
  const h = Math.min(150, Math.max(5, parseInt(document.getElementById("customH").value, 10) || 29));
  if (beadCount > 0 && !confirm("切换画板尺寸会清空当前图案，确定吗？")) return;
  cols = w;
  rows = h;
  buildBoard();
});

/* ============================================================
 * 内置模板加载
 * ============================================================ */
const templateSelect = document.getElementById("templateSelect");
TEMPLATES.forEach((tpl, i) => {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = tpl.name;
  templateSelect.appendChild(opt);
});

templateSelect.addEventListener("change", () => {
  const idx = templateSelect.value;
  templateSelect.value = "";
  if (idx === "") return;
  loadTemplate(TEMPLATES[idx]);
});

function loadTemplate(tpl) {
  if (beadCount > 0 && !confirm("加载模板会覆盖当前图案，确定吗？")) return;

  const h = tpl.art.length;
  const w = Math.max(...tpl.art.map((r) => r.length));
  cols = rows = 29;
  document.getElementById("boardSize").value = "29";
  buildBoard();

  const r0 = Math.floor((rows - h) / 2);
  const c0 = Math.floor((cols - w) / 2);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < tpl.art[r].length; c++) {
      const colorIdx = CHAR_MAP[tpl.art[r][c]];
      if (colorIdx === undefined) continue;
      addBead(r0 + r, c0 + c, colorIdx);
    }
  }
  rebuildBeads();
  updateStatus();
  toast(`已加载模板：${tpl.name}`);
}

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
  scheduleAutoSave();
}

/* ============================================================
 * 实时自动保存（每次变动后 400ms 防抖写入 localStorage）
 * ============================================================ */
const AUTOSAVE_KEY = "perler-beads-autosave";
let autoSaveTimer = null;

function saveNow() {
  try {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({
        cols,
        rows,
        grid: grid.map((row) => row.join(",")).join(";"),
      })
    );
  } catch {
    /* 存储空间不足时忽略 */
  }
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveNow, 400);
}

window.addEventListener("pagehide", () => {
  clearTimeout(autoSaveTimer);
  saveNow();
});

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

// 启动时恢复上次的画板（自动保存的内容）
(function restoreAutoSave() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    cols = data.cols;
    rows = data.rows;
    const sel = document.getElementById("boardSize");
    if (![...sel.options].some((o) => o.value === String(cols))) {
      const opt = document.createElement("option");
      opt.value = String(cols);
      opt.textContent = `${cols} × ${rows}`;
      sel.appendChild(opt);
    }
    sel.value = String(cols);
    buildBoard();
    data.grid.split(";").forEach((line, r) => {
      if (r >= rows) return;
      line.split(",").forEach((v, c) => {
        if (c < cols && v !== "-1") addBead(r, c, parseInt(v, 10));
      });
    });
    rebuildBeads();
    updateStatus();
  } catch {
    /* 存档损坏则忽略 */
  }
})();

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  updateCursorRig(dt);
  updateStacks(dt);
  updateFalling(dt);
  controls.update();
  renderer.render(scene, camera);
}
animate();
