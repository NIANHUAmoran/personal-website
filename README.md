# Personal Website

一个使用 Astro 构建的轻量个人主页、博客与作品集。博客内容使用 Markdown / MDX 和 Astro Content Collections；静态构建结果可直接部署到 Cloudflare Pages。

## 本地开发

需要 Node.js 22.12 或更高版本。

```bash
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:4321/`。

## 检查与构建

```bash
npm run check
npm run build
```

`npm run build` 会先执行 Astro 类型检查，再生成静态站点到 `dist/`。可用 `npm run preview` 本地预览构建结果。

## 新建博客

在 `src/content/blog/` 新建 `.md` 或 `.mdx` 文件，例如：

```markdown
---
title: "文章标题"
description: "一句话摘要"
pubDate: 2026-10-06
tags:
  - 推荐系统
  - LLM
column: ai
featured: false
draft: false
---

正文从这里开始。
```

文件名会成为文章 URL，例如 `my-note.md` 对应 `/blog/my-note/`。`draft: true` 的文章不会出现在站点列表、文章路由、归档或 RSS 中。

Frontmatter 结构统一定义在 `src/content.config.ts`。支持的字段：

- `title`、`description`、`pubDate`：必填
- `tags`：字符串数组，默认为空
- `column`：可选的专栏 slug，例如 `ai`
- `featured`、`draft`：布尔值，默认为 `false`
- `updatedDate`：可选更新时间
- `cover`：可选的文章页首图；省略时使用无图文章结构

有首图的文章可在 Frontmatter 中添加：

```yaml
cover:
  src: /images/articles/example.webp
  alt: 这张图片的内容描述
  caption: 图片说明（可省略）
```

首图只出现在文章详情页；文章列表仍显示标题、摘要和日期。长文有多个二级或三级标题时会生成目录，正文图片可点击放大，代码围栏使用 Mac 风格外观。

站点主字体为屏显臻宋 v1.10 的标准字表 WOFF2 子集，未收录的字回退到系统宋体。代码字体为霞鹜文楷等宽 Regular 的 WOFF2 版本，未收录的字符回退到系统等宽字体。网页字体及其 OFL 授权文件保存在 `public/fonts/`；霞鹜文楷等宽的原始 TTF 保存在 `src/assets/font-sources/`。

屏显臻宋子集来自 [clear-han-serif-subset](https://github.com/airinghost/clear-han-serif-subset)，霞鹜文楷等宽来自用户提供的字体文件。两者均按各自的 SIL Open Font License 1.1 授权使用。

## 添加项目

所有项目索引统一维护在 `src/data/projects.ts`。复制一个数据项并修改：

- `title`、`slug`、`description`、`type`、`tags`（类型和标签不显示在摘要列表中）
- `pubDate`：可选的首次公开发布日期，格式为 `YYYY-MM-DD`；填写后会显示在项目列表中
- `featured: true`：同时显示在首页精选项目中
- `href`：项目地址
- `linkType`：`internal`、`github` 或 `external`
- `column`：可选的专栏 slug，例如 `lineage`

## 新增专栏

专栏用于按长期主题聚合文章与项目，不会取代博客或项目页面。

1. 在 `src/data/columns.ts` 的 `columns` 数组中新增一项：

```ts
{
  title: '哲学',
  slug: 'philosophy',
  description: '关于哲学阅读与问题的长期记录。',
  href: '/columns/philosophy/',
  featured: true,
}
```

静态构建会自动生成 `/columns/philosophy/`，不需要手动创建页面。

2. 在文章 Frontmatter 中加入：

```yaml
column: ai
```

3. 在项目数据中加入：

```ts
column: 'lineage'
```

`column` 对文章和项目都是可选字段。没有专栏的内容仍会正常显示在博客、项目页和归档中。

## 添加独立 HTML 项目

把完整项目目录直接放在 `public/projects/` 下，不需要改造成 Astro 组件：

```text
public/projects/my-project/
├── index.html
├── style.css
├── app.js
└── assets/
```

部署后访问路径为：

```text
https://example.com/projects/my-project/
```

独立项目里的 CSS、JavaScript、图片与字体建议使用相对路径，例如 `./style.css`、`./assets/image.png`。再在 `src/data/projects.ts` 中添加 `href: '/projects/my-project/'` 即可从主站进入。

仓库内的 `public/projects/lineage/` 是“历代帝系与世系图谱”独立项目，包含自己的入口页、HTML 页面、样式、脚本与资源。`public/projects/ming/` 保留为旧地址兼容入口。

世系图采用“独立子目录＋站内链接”的接入方式：主站项目卡片指向 `/projects/lineage/`，相关文章可直接写 `[历代帝系与世系图谱](/projects/lineage/)`。不要将图谱的 `han.css` 直接加载进 Astro 页面；它含有全局元素样式，图谱自身的横向滚动和固定水印也更适合在独立页面运行。主站不使用 `han.css`，因此暂不跨目录共用这套资源。替换图谱文件时保留目录层级，并检查旧地址 `/projects/ming/` 的跳转目标仍存在。

从图谱源码更新时，只同步三张 `*_lineage.html` 页面、`assets/lineage/` 下的样式与脚本，以及它们引用的新资源；保留本站专用的 `index.html` 和 `style.css`。发布目录只保留 WOFF2 字体子集，不放入字体母本、制作工具或纹理源图。图谱新增汉字后，先在源码项目重做字体子集，再同步新的 WOFF2 文件。

## Cloudflare Pages 部署

1. 将项目推送到 GitHub。
2. 在 Cloudflare Pages 中连接该仓库。
3. 使用以下构建设置：

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
```

本项目是纯静态输出，不需要 Cloudflare adapter、数据库或常驻 Node.js 服务。

## 首次使用需要修改

在 `src/config.ts` 中替换以下占位信息：

- `siteName`
- `siteDescription`
- `author`
- `siteUrl`（必须改成最终域名，供 canonical、RSS 与 sitemap 使用）
- `github`
- `email`
- `heroLine` 与 `heroIntro`

同时检查 `src/data/projects.ts` 中的示例 GitHub / 外部网站链接。

## 主要目录

```text
.
├── public/
│   ├── images/
│   └── projects/ming/
├── src/
│   ├── components/
│   ├── content/blog/
│   ├── data/
│   │   ├── columns.ts
│   │   └── projects.ts
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   ├── styles/global.css
│   ├── config.ts
│   └── content.config.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```
