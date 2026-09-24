# Perler Beads 拼豆工坊

一个基于 **Three.js** 的 3D 拼豆（Perler Beads）小游戏，在浏览器里体验真实的拼豆乐趣：放豆、擦除、取色、导入图片自动转图案、导出图纸。

## ✨ 功能特性

- 🎨 **3D 拼豆画板**：钉柱画板 + 圆豆 + 中孔效果，InstancedMesh 渲染，万级豆子流畅运行
- 🖌️ **三种工具**：放豆（拖动连画不断线）、擦除、取色器
- 🌈 **19 种经典拼豆颜色**
- 🖼️ **图片导入**：任意图片自动降采样并映射到最接近的拼豆颜色，按图片比例自动调整画板
- 📸 **导出 PNG**：像素风拼豆图纸（含中孔）
- 💾 **存档**：保存到 / 读取自浏览器 localStorage
- 🔄 **3D 视角**：拖拽旋转、滚轮缩放

## 🚀 运行

```bash
npm install
npm run dev        # 开发模式
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物
```

## 🌐 在线游玩

每次推送到 `main` 分支，GitHub Actions 会自动构建并部署到 GitHub Pages：

**https://hencter.github.io/perler-beads/**

部署配置见 `.github/workflows/deploy.yml`。

## 🎮 操作说明

| 操作 | 效果 |
|------|------|
| 左键点击 / 拖动 | 放豆（按住拖动可连画） |
| 右键点击 / 拖动 | 擦除 |
| 拖拽空白处 | 旋转视角 |
| 滚轮 | 缩放 |
| 💉 取色工具 | 点击已有豆子吸取颜色 |

## 🛠️ 技术

- [Three.js](https://threejs.org/) + [Vite](https://vite.dev/)
- `InstancedMesh` 批量渲染豆子与钉柱
- 射线与平面求交实现网格拾取，Bresenham 插值实现拖动连画
- Canvas 2D 实现图片降采样与最近色映射、PNG 导出

## 📄 许可

MIT
