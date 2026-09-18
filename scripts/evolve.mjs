import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../data/evolution.json", import.meta.url);
const deployPath = new URL("../dist/data/evolution.json", import.meta.url);
const today = new Date().toISOString().slice(0, 10);

const mutationPool = [
  {
    focus: "可解释性",
    hypothesis: "如果让每轮变更都带一条可读的证据，复盘者会更容易区分真正的学习与随机漂移。",
    changes: ["为迭代记录补充证据摘要", "把证据与决策并列展示"],
    delta: { clarity: 3, stability: 1, autonomy: 1, learnability: 3 }
  },
  {
    focus: "稳定性",
    hypothesis: "如果把每日数据同步做成写入后校验，发布副本就更不容易与事实来源分叉。",
    changes: ["增加发布副本校验", "在运行日志中写入校验结果"],
    delta: { clarity: 1, stability: 4, autonomy: 1, learnability: 2 }
  },
  {
    focus: "自主性",
    hypothesis: "如果候选方向按最近一次低分指标加权选择，下一轮进化会更像基于反馈的决策。",
    changes: ["按短板指标选择候选", "记录选择依据"],
    delta: { clarity: 2, stability: 1, autonomy: 4, learnability: 3 }
  },
  {
    focus: "可学习性",
    hypothesis: "如果每轮都保留一条未采纳的替代路径，系统就能把‘保持不变’也变成可学习的结果。",
    changes: ["记录保留的替代路径", "区分 adopted 与 hold"],
    delta: { clarity: 3, stability: 2, autonomy: 2, learnability: 4 }
  }
];

const raw = await readFile(sourcePath, "utf8");
const state = JSON.parse(raw);
if (!state.project || !Array.isArray(state.iterations) || !state.metrics) {
  throw new Error("evolution.json does not match the RSI data contract");
}

const latest = state.iterations.at(-1);
if (latest?.date === today) {
  console.log(`No-op: RSI already evolved on ${today}.`);
  process.exit(0);
}

const previous = latest?.metrics ?? state.metrics;
const weakestMetric = Object.entries(previous).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "clarity";
const candidateIndex = (state.iterations.length + weakestMetric.length) % mutationPool.length;
const candidate = mutationPool[candidateIndex];
const nextMetrics = Object.fromEntries(
  Object.entries(previous).map(([key, value]) => [key, Math.min(99, value + (candidate.delta[key] ?? 1))])
);
const score = Math.round(Object.values(nextMetrics).reduce((sum, value) => sum + value, 0) / 4);
const nextVersion = `v0.${state.iterations.length + 1}.0`;

state.metrics = nextMetrics;
state.nextHypothesis = candidate.hypothesis;
state.iterations.push({
  date: today,
  version: nextVersion,
  hypothesis: candidate.hypothesis,
  changes: candidate.changes,
  metrics: nextMetrics,
  decision: score >= 70 ? "adopted" : "hold",
  rationale: `本轮聚焦“${candidate.focus}”，综合评分为 ${score}；变更范围仍限制在数据和演示层。`
});

const output = `${JSON.stringify(state, null, 2)}\n`;
await writeFile(sourcePath, output, "utf8");
await writeFile(deployPath, output, "utf8");
console.log(`Evolved RSI to ${nextVersion} on ${today} (${candidate.focus}).`);
