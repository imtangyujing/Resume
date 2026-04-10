const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, "data", "portfolio-sources.json");
const INDEX_DATA_FILE = path.join(ROOT_DIR, "data", "index-content.json");
const ABOUT_DATA_FILE = path.join(ROOT_DIR, "data", "about-content.json");
const EXPERIENCE_DATA_FILE = path.join(ROOT_DIR, "data", "experience-content.json");
const WIZARD_DATA_FILE = path.join(ROOT_DIR, "data", "wizard-content.json");
const PORT = Number(process.env.PORT || 8000);
const METRIC_ICON_ALIASES = {
  favorite: "favorite",
  like: "favorite",
  likes: "favorite",
  heart: "favorite",
  点赞: "favorite",
  喜欢: "favorite",
  爱心: "favorite",
  小心心: "favorite",
  visibility: "visibility",
  view: "visibility",
  views: "visibility",
  eye: "visibility",
  阅读: "visibility",
  阅读量: "visibility",
  浏览: "visibility",
  浏览量: "visibility",
  眼睛: "visibility",
  campaign: "campaign",
  speaker: "campaign",
  megaphone: "campaign",
  喇叭: "campaign",
  小喇叭: "campaign",
  graphic_eq: "graphic_eq",
  music: "graphic_eq",
  音乐: "graphic_eq",
};

app.use(express.static(ROOT_DIR, { extensions: ["html"] }));

app.get("/api/portfolio/cards", async (_req, res) => {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const config = JSON.parse(raw);
    const sourceCards = config["卡片列表"] || config.cards || [];
    const cards = await Promise.all(sourceCards.map(resolveCard));
    res.json({
      cards,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to load portfolio cards:", error);
    res.status(500).json({
      error: "Failed to load portfolio cards",
    });
  }
});

app.get("/api/index/content", async (_req, res) => {
  await sendJsonFile(res, INDEX_DATA_FILE, "首页内容");
});

app.get("/api/about/content", async (_req, res) => {
  await sendJsonFile(res, ABOUT_DATA_FILE, "关于页内容");
});

app.get("/api/experience/content", async (_req, res) => {
  await sendJsonFile(res, EXPERIENCE_DATA_FILE, "经历页内容");
});

app.get("/api/wizard/content", async (_req, res) => {
  await sendJsonFile(res, WIZARD_DATA_FILE, "魔法小人台词");
});

app.listen(PORT, () => {
  console.log(`Resume app running at http://localhost:${PORT}`);
});

async function sendJsonFile(res, filePath, rootKey) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const payload = JSON.parse(raw);
    res.json({
      content: payload[rootKey] || payload,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Failed to load ${rootKey}:`, error);
    res.status(500).json({
      error: `Failed to load ${rootKey}`,
    });
  }
}

async function resolveCard(card) {
  const normalized = normalizeCard(card);
  const live = await resolveLiveStats(normalized.dataSource);
  const usesManualFallback = !normalized.dataSource.type || normalized.dataSource.type === "manual";
  const primaryMetric = usesManualFallback
    ? normalized.fallback.primaryMetric
    : (live.primaryMetric || normalized.fallback.primaryMetric);
  const secondaryMetric = usesManualFallback
    ? normalized.fallback.secondaryMetric
    : (live.secondaryMetric || normalized.fallback.secondaryMetric);
  const kicker = usesManualFallback
    ? normalized.kicker
    : (live.kicker || normalized.kicker);
  const title = usesManualFallback
    ? normalized.title
    : (live.title || normalized.title);

  return {
    id: normalized.id,
    category: normalized.category,
    platform: normalized.platform,
    kicker,
    title,
    imageUrl: normalized.imageUrl,
    linkUrl: normalized.linkUrl,
    primaryMetric,
    secondaryMetric,
    refreshedAt: live.refreshedAt || new Date().toISOString(),
  };
}

function normalizeCard(card) {
  const fallback = card["默认显示"] || card.fallback || {};
  const dataSource = card["实时数据配置"] || card.dataSource || {};
  const manualData = dataSource["手动数据"] || dataSource.manualData || {};

  return {
    id: card["唯一标识"] || card.id,
    category: card["分类"] || card.category,
    platform: card["平台"] || card.platform,
    kicker: card["上方小字"] || card.kicker,
    title: card["标题"] || card.title,
    imageUrl: card["封面图"] || card.imageUrl,
    linkUrl: card["跳转链接"] || card.linkUrl,
    fallback: {
      primaryMetric: normalizeMetric(fallback["底部左侧指标"] || fallback.primaryMetric),
      secondaryMetric: fallback["底部右侧文字"] || fallback.secondaryMetric,
    },
    dataSource: {
      type: dataSource["类型"] || dataSource.type,
      url: dataSource["接口地址"] || dataSource.url,
      headers: dataSource["请求头"] || dataSource.headers,
      mappings: dataSource["字段映射"] || dataSource.mappings,
      primaryMetric: normalizeMetric(manualData["底部左侧指标"] || dataSource.primaryMetric),
      secondaryMetric: manualData["底部右侧文字"] || dataSource.secondaryMetric,
      kicker: manualData["上方小字"] || dataSource.kicker,
      title: manualData["标题"] || dataSource.title,
    },
  };
}

function normalizeMetric(metric) {
  if (!metric) return null;
  const rawIcon = metric["图标"] || metric.icon || "favorite";
  return {
    icon: normalizeMetricIcon(rawIcon),
    value: metric["值"] || metric.value || "",
  };
}

function normalizeMetricIcon(icon) {
  const normalized = String(icon || "favorite").trim();
  return METRIC_ICON_ALIASES[normalized] || normalized;
}

async function resolveLiveStats(dataSource = {}) {
  if (!dataSource.type || dataSource.type === "manual") {
    return {
      primaryMetric: dataSource.primaryMetric,
      secondaryMetric: dataSource.secondaryMetric,
      kicker: dataSource.kicker,
      title: dataSource.title,
      refreshedAt: new Date().toISOString(),
    };
  }

  if (dataSource.type === "json") {
    return resolveJsonSource(dataSource);
  }

  return {
    refreshedAt: new Date().toISOString(),
  };
}

async function resolveJsonSource(dataSource) {
  if (!dataSource.url) {
    return {
      refreshedAt: new Date().toISOString(),
    };
  }

  const response = await fetch(dataSource.url, {
    headers: {
      "accept": "application/json",
      ...(dataSource.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`JSON source request failed: ${response.status}`);
  }

  const payload = await response.json();

  return {
    primaryMetric: selectMetric(payload, dataSource.mappings?.primaryMetric),
    secondaryMetric: selectValue(payload, dataSource.mappings?.secondaryMetric),
    kicker: selectValue(payload, dataSource.mappings?.kicker),
    title: selectValue(payload, dataSource.mappings?.title),
    refreshedAt: new Date().toISOString(),
  };
}

function selectMetric(payload, mapping) {
  if (!mapping) return null;
  const value = selectValue(payload, mapping.valuePath);
  if (value === null || value === undefined || value === "") return null;

  return {
    icon: mapping.icon || "favorite",
    value: String(value),
  };
}

function selectValue(payload, pathExpression) {
  if (!pathExpression) return null;
  return String(pathExpression)
    .split(".")
    .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), payload);
}
