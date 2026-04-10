#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PORTFOLIO_FILE = path.join(ROOT_DIR, "data", "portfolio-sources.json");
const DEFAULT_INPUT_FILE = path.join(ROOT_DIR, "data", "wechat-links.txt");
const LOCAL_COVER_DIR = path.join(ROOT_DIR, "data", "wechat-covers");
const LOCAL_COVER_PUBLIC_DIR = "data/wechat-covers";

const DEFAULT_COVERS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB9oaymuGgq741LSstJKbbi5V_Otl56h1dwG1ghZEN3TJD0XJpYh_tIT2mvMuUc52PBdOh_q_rTAYYy6vGV49xEK6mFuMEaRIjmgA1N0gIbjaD3qyCzs-bMZNksmz7iY8p5mT0i0G2hSzconVYPexMThqXDALSdTsFTloVZI1tl6hrPXILwqlF4eYisXCrAs-oMIgjtE4EWH80zodXpAr8IyJKuT092_WIE5CDUOsYyf10zGZimpHXrwFxcfRttNdYXJtGG4FNe1Ho",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBA02cY109I6idzumBi_nK_h04WFzbo9FqIoCDQoUn0sfu1aDujA7E-22f1H8PfloJ4iQl79_-JNKLcXJipb3GzX0Tpe9-UrpQoq_jNELBWAiN-1JUBZ5koFhKpo_2QA88jcQkZF2VneU410eW4M_EB-5jtNHR0MXTkQjutcogxOiHfu9pVlYrB2hFtwusNlbFfvp2H3K51Ewga2geYws77Mg3wZHvVR65R7r0wSkNb3Lh09pmAoSLfmAULsQFJCm1k7-E3jjU334o",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDPpWQJWgpbReqyM2PlxUNGDSKm7GbeqF5HddX9DOYnex9p74p_-_w5HoAKURoQDf0udBMRJ4xCP0SDCVDyr_QB9BwtUMd6oCBNK-D27X1MsMuY0GWq4lcoJLfTkg-XWrI05my-lOV0MUQOHYH1dk7ZWsAFoUcPdNMwGZ3ATNNGtNi6bavypi56Y7EqtqpPn52QaznLfenjah_t2M8kGD4ImkwZFSV4VmTSJonNJ8M095rybbK9jCAnHAJ5-kvmulJgV7sUc8NOuOE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDxNwSE4-5bP02bVDvCYQHNoMk7opIyZtefaOWL4XFUX8Cu1sMQqbkhSbOUi3YtTxGIhvceB9yij_teHJEECeZIrRzqo9DJy1_Nwr3YJnkp2kYc3ue2XyMBHV8SlzBedoRarwrBNPQMAWTvIsSpvVH8FYl_6fTvvI7KIJ-Hxjgl7zi7oGma7RmFz0zkImXuORPBrPbvG3E_SZah5LcDLRNKnAs0Rhc7Ckz3iVW6hRyvZbA0XVMC_EgewCT6e842JtX7Wza48hYcmIY",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAbGqXQiMRdpyvaF4doAvrSsjtiDKRTLCmHxAPcMbmMD6p9V-PlfcvO6K9S5SaGDnbWlJk-5HjjEH635lqWIqGTgjfIcs5DSI-0_gc4Kp0oX0Qi2UeCs5Jt3bgCtkFqvPciVj-hm4AKSEzUEoNLZkuoJOt1nqF25WQS_Q-xebdkRxBvluYMIekwxxAQVJausQRcCLVoEW6DZN8lGj9pMfWFzQ3ha89soS2I7bZ0gVY5hSVEnTxmBqDMuHPkQyPTJQ4ULU61FThtoYg",
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(ROOT_DIR, options.file || DEFAULT_INPUT_FILE);
  const text = await fs.readFile(inputPath, "utf8");
  const urls = Array.from(
    new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
    )
  );

  if (urls.length === 0) {
    throw new Error(`没有读取到可导入的链接，请检查文件：${inputPath}`);
  }

  const raw = await fs.readFile(PORTFOLIO_FILE, "utf8");
  const config = JSON.parse(raw);
  const cards = Array.isArray(config["卡片列表"]) ? config["卡片列表"] : [];

  const existingByUrl = new Map(
    cards
      .filter((card) => typeof card["跳转链接"] === "string")
      .map((card) => [normalizeUrl(card["跳转链接"]), card])
  );

  const importedCards = [];
  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const metadata = await fetchWechatMetadata(url);
    const existing = existingByUrl.get(normalizeUrl(url));
    importedCards.push(await buildCard({ url, metadata, existing, index, options }));
  }

  const importedUrls = new Set(importedCards.map((card) => normalizeUrl(card["跳转链接"])));
  const preservedCards = cards.filter((card) => !importedUrls.has(normalizeUrl(card["跳转链接"])));
  config["卡片列表"] = options.prepend
    ? [...importedCards, ...preservedCards]
    : [...preservedCards, ...importedCards];

  if (options.dryRun) {
    console.log(`Dry run: 将导入 ${importedCards.length} 篇公众号文章`);
    for (const card of importedCards) {
      console.log(`- ${card["标题"]}`);
    }
    return;
  }

  await fs.writeFile(PORTFOLIO_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(`已导入 ${importedCards.length} 篇公众号文章到 ${PORTFOLIO_FILE}`);
}

function parseArgs(args) {
  const options = {
    file: DEFAULT_INPUT_FILE,
    prepend: true,
    dryRun: false,
    localizeCovers: true,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--file" && args[i + 1]) {
      options.file = args[i + 1];
      i += 1;
    } else if (arg === "--append") {
      options.prepend = false;
    } else if (arg === "--prepend") {
      options.prepend = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--keep-remote-covers") {
      options.localizeCovers = false;
    }
  }

  return options;
}

async function fetchWechatMetadata(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`抓取失败 ${response.status}: ${url}`);
  }

  const html = await response.text();
  return {
    title: decodeHtml(selectMeta(html, "og:title") || selectMeta(html, "twitter:title") || selectTitle(html) || "未命名文章"),
    imageUrl: decodeHtml(selectMeta(html, "og:image") || selectMeta(html, "twitter:image") || ""),
    publishLabel: extractPublishLabel(html),
  };
}

async function buildCard({ url, metadata, existing, index, options }) {
  const fallbackImage = DEFAULT_COVERS[index % DEFAULT_COVERS.length];
  const title = metadata.title;
  const cardId = existing?.["唯一标识"] || `wechat-${slugify(title)}`;
  const inferredTag = inferArticleTag(title);
  const coverImage = await resolveCoverImage({
    cardId,
    remoteUrl: metadata.imageUrl,
    existingImage: existing?.["封面图"],
    fallbackImage,
    shouldLocalize: options.localizeCovers && !options.dryRun,
  });

  return {
    "唯一标识": cardId,
    "分类": "article",
    "平台": "WeChat",
    "上方小字": existing?.["上方小字"] || "WeChat // Article",
    "标题": title,
    "封面图": coverImage,
    "跳转链接": url,
    "默认显示": {
      "底部左侧指标": {
        "图标": existing?.["默认显示"]?.["底部左侧指标"]?.["图标"] || "阅读量",
        "值": existing?.["默认显示"]?.["底部左侧指标"]?.["值"] || "NEW",
      },
      "底部右侧文字": pickTag(existing?.["默认显示"]?.["底部右侧文字"], inferredTag),
    },
    "实时数据配置": {
      "类型": "manual",
      "手动数据": {
        "底部左侧指标": {
          "图标":
            existing?.["实时数据配置"]?.["手动数据"]?.["底部左侧指标"]?.["图标"] ||
            existing?.["默认显示"]?.["底部左侧指标"]?.["图标"] ||
            "阅读量",
          "值":
            existing?.["实时数据配置"]?.["手动数据"]?.["底部左侧指标"]?.["值"] ||
            existing?.["默认显示"]?.["底部左侧指标"]?.["值"] ||
            "NEW",
        },
        "底部右侧文字": pickTag(
          existing?.["实时数据配置"]?.["手动数据"]?.["底部右侧文字"] ||
            existing?.["默认显示"]?.["底部右侧文字"],
          inferredTag
        ),
      },
    },
  };
}

async function resolveCoverImage({ cardId, remoteUrl, existingImage, fallbackImage, shouldLocalize }) {
  if (shouldLocalize && remoteUrl) {
    try {
      return await downloadCoverToLocal(cardId, remoteUrl);
    } catch (error) {
      console.warn(`封面本地化失败，继续回退远程图：${cardId}`, error.message || error);
    }
  }

  return remoteUrl || existingImage || fallbackImage;
}

async function downloadCoverToLocal(cardId, remoteUrl) {
  await fs.mkdir(LOCAL_COVER_DIR, { recursive: true });

  const response = await fetch(remoteUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      referer: "https://mp.weixin.qq.com/",
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`封面下载失败 ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const extension = guessImageExtension(contentType, remoteUrl);
  const filename = `${sanitizeFilename(cardId)}.${extension}`;
  const filePath = path.join(LOCAL_COVER_DIR, filename);
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
  return `${LOCAL_COVER_PUBLIC_DIR}/${filename}`;
}

function normalizeUrl(url) {
  return String(url || "").trim();
}

function slugify(value) {
  const ascii = String(value || "")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || `article-${Date.now()}`;
}

function sanitizeFilename(value) {
  return String(value || "wechat-cover")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "wechat-cover";
}

function guessImageExtension(contentType, url) {
  if (/png/i.test(contentType)) return "png";
  if (/webp/i.test(contentType)) return "webp";
  if (/gif/i.test(contentType)) return "gif";
  if (/jpe?g/i.test(contentType)) return "jpg";
  if (/\.png(\?|$)/i.test(url)) return "png";
  if (/\.webp(\?|$)/i.test(url)) return "webp";
  if (/\.gif(\?|$)/i.test(url)) return "gif";
  return "jpg";
}

function inferArticleTag(title) {
  const value = String(title || "");

  if (/(专访|对话|访谈)/.test(value)) return "TALK";
  if (/(曝光|宣布|离职|发布|上线|开源|融资|发布会)/.test(value)) return "INFO";
  if (/(为什么|评论|观察|八卦|仍被困|别让)/.test(value)) return "COMMENTARY";
  return "ARTICLE";
}

function pickTag(existingTag, fallbackTag) {
  const normalized = String(existingTag || "").trim().toUpperCase();
  const allowedTags = new Set(["TALK", "ARTICLE", "COMMENTARY", "INFO"]);
  return allowedTags.has(normalized) ? normalized : fallbackTag;
}

function selectMeta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escapeRegExp(key)}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegExp(key)}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escapeRegExp(key)}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRegExp(key)}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function selectTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1] || "";
}

function extractPublishLabel(html) {
  const publishMatch =
    html.match(/publish_time\s*[:=]\s*["'](\d{4})[-/](\d{1,2})[-/](\d{1,2})["']/i) ||
    html.match(/var\s+ct\s*=\s*["']?(\d{10})["']?/i);

  if (!publishMatch) return "";

  if (publishMatch.length === 4) {
    const [, year, month, day] = publishMatch;
    return formatMonthDay(Number(month), Number(day), Number(year));
  }

  if (publishMatch.length === 2) {
    const timestamp = Number(publishMatch[1]) * 1000;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return formatMonthDay(date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCFullYear());
  }

  return "";
}

function formatMonthDay(month, day) {
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  if (!monthNames[month - 1] || !day) return "";
  return `${monthNames[month - 1]} ${String(day).padStart(2, "0")}`;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
