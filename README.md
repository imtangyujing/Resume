# Resume

一个基于纯静态 HTML 的个人简历 / 作品集项目，当前仓库主要用于承载一套高视觉风格的网页简历页面，以及对应的原始简历资料文件。

## 项目概览

这个项目不是 React、Vue、Next.js 之类的前端工程，而是一个无需构建的静态网站：

- 页面由独立的 HTML 文件组成
- 样式主要写在各页面内联的 `<style>` 中
- 交互主要写在各页面内联的 `<script>` 中
- UI 依赖 CDN 版 Tailwind CSS、Google Fonts 和 Material Symbols

当前页面风格偏艺术化、杂志感和装置感，带有较多动效与视觉表达，适合作为个人品牌展示页的雏形。

## 目录结构

```text
.
├── .editorconfig                   # 跨编辑器统一缩进、编码、换行
├── .gitattributes                  # 统一 Git 文本换行策略
├── .gitignore                      # 忽略本地预览和系统杂项
├── index.html                      # 首页 / Landing Page
├── works.html                      # 作品集页
├── experience.html                 # 经历页
├── about.html                      # 关于页
├── Image/                          # 本地图片素材
├── scripts/serve.sh                # 本地预览脚本
├── 唐榆景-西南财经大学-金融学.pdf      # 原始 PDF 简历
└── 唐榆景-西南财经大学-金融学 - 2.docx # 原始 Word 简历
```

## 页面说明

### `index.html`

- 项目首页
- 承担整体视觉基调展示
- 包含树、落叶、时间轴、页面跳转等动效

### `works.html`

- 作品集展示页
- 当前是偏 editorial / gallery 风格的折页式展示布局
- 带有左右翻页、分类切换等交互

### `experience.html`

- 经历展示页
- 当前采用摊开的书册 / 左右翻页叙事方式
- 适合展示教育、实习、项目、社团或内容创作经历

### `about.html`

- 个人介绍页
- 当前包含肖像图、简介、联系方式等内容模块

## 如何开始

### 克隆仓库

```bash
git clone https://github.com/imtangyujing/Resume.git
cd Resume
```

### 查看当前分支状态

```bash
git status
```

### 拉取最新代码

```bash
git pull origin main
```

## 如何预览

首页、经历页和关于页仍然可以直接作为静态 HTML 预览。

作品集页 `works.html` 现在带有一个轻量后端接口，所以如果想完整查看作品卡片跳转和动态指标，建议启动本地 Node 服务。

直接用浏览器打开任意 HTML 文件即可，例如：

```bash
open /Users/jay/Documents/Dev/Resume/index.html
```

如果想用完整服务方式预览，在仓库根目录运行：

```bash
npm install
npm run dev
```

或者使用仓库内置脚本：

```bash
bash scripts/serve.sh
```

指定端口：

```bash
bash scripts/serve.sh 9000
```

然后访问：

```text
http://localhost:8000
```

### `works.html` 后端说明

- 接口地址：`/api/portfolio/cards`
- 数据配置文件：[data/portfolio-sources.json](/Users/lzw/Documents/Resume/data/portfolio-sources.json)
- 服务入口：[server.js](/Users/lzw/Documents/Resume/server.js)

当前卡片已经支持：

- 点击整张卡片跳转到公众号、小红书或其他外部平台链接
- 由后端统一返回卡片数据
- 在卡片底部原有位置显示动态指标文案

当前支持的数据源类型：

- `manual`：手动维护指标与跳转链接
- `json`：从外部 JSON 接口读取实时数据，适合后续接你自己的采集服务

说明：

- 微信公众号和小红书的公开实时数据接口限制较多
- 目前仓库先把“页面展示 + 后端取数结构 + 可配置外链”搭好
- 后续只需要补真实链接和具体数据源，不需要重写页面结构

### 批量导入公众号文章

如果你不想手动一篇篇把公众号链接粘进 JSON，现在可以直接走批量导入脚本：

1. 把公众号链接逐行写进 [data/wechat-links.txt](/Users/lzw/Documents/Resume/data/wechat-links.txt)
2. 在仓库根目录运行：

```bash
npm run import:wechat
```

脚本会自动：

- 抓取文章标题
- 尝试抓取封面图
- 生成或更新对应的 `Portfolio` 卡片
- 写回 [data/portfolio-sources.json](/Users/lzw/Documents/Resume/data/portfolio-sources.json)

默认行为：

- 新导入的文章会排在前面
- 如果链接已经存在，会更新那张卡，而不是重复新增
- 左下角指标默认会写成“阅读量”

可选参数：

```bash
node scripts/import-wechat-links.js --dry-run
node scripts/import-wechat-links.js --append
node scripts/import-wechat-links.js --file data/wechat-links.txt
```

## 协作约定

- 默认主分支是 `main`
- 文本文件统一使用 UTF-8 和 LF 换行
- 图片、PDF、DOCX 按互进制文件处理，避免换行污染
- 本地预览目录 `.preview/`、系统文件 `.DS_Store`、工具目录 `.claude/` 不纳入版本控制
- 提交前先运行 `git status`，确认没有误提交本地临时文件

## 掦荐的多人/多端工作流

### 开始工作前

```bash
git pull origin main
git status
```

### 修改后提交

```bash
git add .
git commit -m "Your change summary"
git push origin main
```

### 切分支开发

如果后续改动开始变多，建议改成分支工作流：

```bash
git checkout -b feat/update-experience-page
```

完成后推送：

```bash
git push -u origin feat/update-experience-page
```

## 当前现状

仓库已经具备较完整的视觉页面和基础交互，但内容层面仍处于“模板 / 半成品”状态，主要体现在：

- 页面中的人物设定、经历描述、作品内容存在明显的模板化或占位内容
- 网页内容与仓库中的真实简历资料（PDF / DOCX）目前并不完全一致
- 页面之间有统一视觉语言，但文案与信息架构还没有完全回填为真实简历内容

换句话说，这个仓库当前更像是“个人简历网站的视觉原型 + 内容待替换版本”，而不是已经完成最终交付的正式站点。

## 建议的下一步

- 将 `about.html`、`experience.html`、`works.html` 中的占位内容替换为真实个人信息
- 统一姓名、教育背景、经历、联系方式等基础资料
- 重新梳理作品集页的内容结构，决定是否保留当前偏艺术化的展示方式
- 视需要提取公共样式和脚本，减少多页面重复代码
- 增加一个简单的本地预览说明或部署说明，便于后续维护

## 技术特点

- 纯静态 HTML，多页面结构
- 通过 CDN 引入 Tailwind CSS
- 页面级内联 CSS 和 JavaScript
- 本地图片资源 + 外部字体资源混合使用
- 轻量 Node/Express 服务用于作品集页接口
- 无前端打包流程

## 备注

如果后续要把这个项目继续做成可长期维护的正式个人站，推荐优先完成两件事：

1. 先把内容全部替换为真实简历信息
2. 再决定是否要升级为带组件化结构的前端工程
