# qwq.my

雪球的个人站。开场是一张图纸，线稿 QwQ 躺在纸上；往下滚，它长出厚度、撕开纸面冲向镜头，镜头穿过纸洞进入一个暗场 3D 世界。之后每个板块是一幕，最后碎纸飞回来，重新拼成一张纸。

## 本地运行

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # 生产构建（每个页面都会预渲染）
pnpm lint
```

## 改内容

所有内容都是普通文件，改完刷新即可：

| 文件 | 内容 |
| --- | --- |
| `content/profile.ts` | 名字、学校、专业、年级、简介、链接 |
| `content/skills.ts` | 技能隧道和 BOM 表 |
| `content/projects.ts` | 项目碑（标题、简介、年份、标签、链接） |
| `content/timeline.ts` | 经历公路上的路标；`media` 可以挂证书或图片，会在路中央展出 |
| `content/posts/<slug>/{zh,en}.mdx` | 文章；缺一种语言时会自动回退并提示 |
| `content/year/2026.ts` | 年度回顾视频的高光事件（数字来自 GitHub） |
| `content/github.json` | GitHub 数据快照：网站会每隔几小时实时抓取，抓不到时用它；`pnpm github:snapshot` 更新 |
| `public/media/` | 头像、证书、授课图片 |
| `messages/{zh,en}.json` | 界面文案 |

颜色在 `app/globals.css` 和 `lib/tokens.ts` 里，两处保持一致。

## 彩蛋和交互

- **终端**：按 `` ` `` 或 ⌘K，或者点右上角的 `>_`。可以试试 `help`、`neofetch`、`qwq OwO`、`debug`，以及 `sudo rm -rf /`。
- **全景**：右上角的「全景」把镜头拉到天上，点任意一幕飞过去。
- **Debug 模式**：从终端输入 `debug`、点技能面板的按钮，或者在 404 页启动。
- **QwQ**：眼睛跟着鼠标走；悬停变 `OwO`，戳它变 `>w<`，连戳五下会哭，甩鼠标会晕，发呆会睡着，离开窗口也会哭。

## 部署（Docker + Cloudflare Tunnel）

生产环境用 `docker compose` 跑两个容器：

- `web`：Next.js standalone 服务，不向宿主机暴露任何端口；
- `tunnel`：cloudflared，通过 Cloudflare Tunnel 把 `qwq.my` 和 `www.qwq.my` 接到 `web`（`www` 会 301 到裸域名）。

DNS 里只有指向隧道的代理 CNAME，服务器 IP 不会出现。

```bash
cp .env.example .env   # 填 TUNNEL_ID、TUNNEL_CREDENTIALS 等
docker compose up -d --build
docker compose logs -f
```

更新：把代码同步到服务器后再执行一次 `docker compose up -d --build`。

## 年度回顾视频（Remotion）

```bash
pnpm video:studio   # 预览、调整
pnpm video:render   # 导出 public/video/year-in-review-2026{,-en}.mp4
```

导出的 MP4 不进 git。网站上的播放器只要发现 `public/video/` 里有文件，就会显示下载按钮。

## 技术

Next.js 16（App Router，Cache Components）· three.js + React Three Fiber · 自写 GLSL（G-buffer 墨线管线：Sobel 描边、网点、排线、纸纹、反相、闪帧、故障）· GSAP + Lenis · Remotion · MDX + Shiki。

3D 字体由 `scripts/to_typeface.py` 从 Archivo 和 JetBrains Mono 转换而来（SIL OFL 1.1），说明见 `public/fonts/README.md`。
