const fallback = {
  project: { name: "RSI Lab", tagline: "让一个网页，自己长出下一版。", status: "等待数据", owner: "RSI Core" },
  metrics: { clarity: 0, stability: 0, autonomy: 0, learnability: 0 },
  nextHypothesis: "等待下一条假设。",
  site: {
    heroTagline: "自己长出下一版。",
    heroLede: "RSI Lab 是一个可观察的自我进化实验：每天提出一个小假设，留下证据，更新网页，并把结果提交回 GitHub。",
    microCopy: "下一轮运行由 GitHub Actions 的每日 cron 触发，输出自动发布到 Cloudflare Pages。",
    guardrailTitle: "自主，但不失控。",
    guardrailCopy: "这不是让系统随意改写自己的权限，而是让它在明确的边界里持续提出、验证和记录下一步。"
  },
  iterations: []
};

const $ = (selector) => document.querySelector(selector);
const average = (metrics) => Math.round(Object.values(metrics).reduce((sum, value) => sum + value, 0) / Math.max(Object.keys(metrics).length, 1));
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[char]));

function render(state) {
  const iterations = state.iterations || [];
  const latest = iterations.at(-1) || { version: "—", date: "—", metrics: state.metrics };
  const site = { ...fallback.site, ...(state.site || {}) };
  const currentVersion = state.project?.version || latest.version || "—";
  const versioning = state.project?.versioning || {};
  const releaseSummary = latest.summary || versioning.summary || (latest.changes?.length ? `本次版本更新：${latest.changes.join("、")}。` : "完成一轮受控进化。");
  const releaseDetails = latest.changes?.join("；") || "等待下一轮更新内容。";
  const sourceLabel = latest.source === "ai" ? "AI 提案" : latest.source === "fallback" ? "规则回退" : "历史记录";
  const selectionRationale = latest.evidence || `当前综合分为 ${average(state.metrics)}。下一轮会读取最新指标，优先关注当前最弱的一项。`;
  const score = average(state.metrics);
  const scores = iterations.map((item) => average(item.metrics));

  document.title = `${state.project?.name || "RSI Lab"} · 自我进化演示`;
  document.querySelector(".status-label").innerHTML = `<i></i> ${escapeHtml(state.project?.status || "演示运行中")}`;
  document.querySelector(".run-version").textContent = currentVersion;
  document.querySelector(".run-card-foot strong").textContent = latest.date;
  $("#hero-tagline").textContent = site.heroTagline;
  $("#hero-lede").textContent = site.heroLede;
  $("#micro-copy").textContent = site.microCopy;
  $("#guardrail-title").textContent = site.guardrailTitle;
  $("#guardrail-copy").textContent = site.guardrailCopy;
  $("#footer-version").textContent = currentVersion;
  $("#evolution-source").textContent = sourceLabel;
  $("#release-summary").textContent = releaseSummary;
  $("#release-details").textContent = releaseDetails;
  $("#score").textContent = score;
  $("#score-meter").style.width = `${score}%`;
  $("#cycles").textContent = iterations.length;
  $("#autonomy").textContent = `${state.metrics.autonomy}%`;
  $("#autonomy-line").style.width = `${state.metrics.autonomy}%`;
  $("#learnability").textContent = `${state.metrics.learnability}%`;
  $("#learnability-line").style.width = `${state.metrics.learnability}%`;
  $("#next-hypothesis").textContent = state.nextHypothesis || "等待下一条假设。";
  $("#selection-rationale").textContent = selectionRationale;

  $("#cycle-bars").innerHTML = iterations.slice(-8).map((item) => `<i style="height:${Math.max(18, average(item.metrics))}%"></i>`).join("");
  $("#trajectory-chart").innerHTML = iterations.map((item, index) => {
    const itemScore = average(item.metrics);
    return `<div class="chart-column"><span class="chart-bar" style="height:${itemScore}%" title="${escapeHtml(item.version)} 综合评分 ${itemScore}"></span><span class="chart-bar mint" style="height:${item.metrics.stability}%" title="${escapeHtml(item.version)} 稳定性 ${item.metrics.stability}"></span><span class="chart-label">${escapeHtml(item.version)}</span></div>`;
  }).join("") || `<span class="chart-label">尚无迭代记录</span>`;
  $("#iteration-list").innerHTML = iterations.slice().reverse().map((item) => {
    const itemScore = average(item.metrics);
    return `<div class="iteration-row"><span class="iteration-date">${escapeHtml(item.date)}</span><div class="iteration-text"><strong>${escapeHtml(item.version)} · ${escapeHtml(item.decision === "adopted" ? "已采纳" : "暂缓")}</strong><span>${escapeHtml(item.hypothesis)}</span></div><span class="iteration-score">${itemScore} / 100</span></div>`;
  }).join("");
}

async function loadState() {
  const button = $("#reload");
  button.disabled = true;
  button.textContent = "读取中…";
  try {
    const response = await fetch(`data/evolution.json?ts=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(await response.json());
  } catch (error) {
    render(fallback);
    console.warn("RSI data unavailable; showing fallback state.", error);
  } finally {
    button.disabled = false;
    button.innerHTML = "刷新状态 <span aria-hidden=\"true\">↗</span>";
  }
}

$("#reload").addEventListener("click", loadState);
loadState();
