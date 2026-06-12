import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const [, , reportPath = 'reports/lighthouse/lighthouse.report.json', summaryPath = 'reports/lighthouse/summary.md'] =
  process.argv;

const thresholds = {
  accessibility: 0.9,
  'best-practices': 0.9,
  performance: 0.8,
  seo: 0.9,
};

const categoryLabels = {
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  performance: 'Performance',
  seo: 'SEO',
};

const metricAudits = [
  ['first-contentful-paint', 'First Contentful Paint'],
  ['largest-contentful-paint', 'Largest Contentful Paint'],
  ['total-blocking-time', 'Total Blocking Time'],
  ['cumulative-layout-shift', 'Cumulative Layout Shift'],
  ['speed-index', 'Speed Index'],
];

await mkdir(dirname(summaryPath), { recursive: true });

let report;

try {
  report = JSON.parse(await readFile(reportPath, 'utf8'));
} catch (error) {
  await writeFile(
    summaryPath,
    [
      '# Lighthouse Report',
      '',
      'Lighthouse did not produce a readable JSON report.',
      '',
      `Report path: \`${reportPath}\``,
      `Error: \`${error instanceof Error ? error.message : String(error)}\``,
      '',
      'Action required: inspect the workflow logs and fix the Lighthouse run before analyzing page quality.',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

const categories = Object.entries(thresholds).map(([id, threshold]) => {
  const category = report.categories?.[id];
  const score = typeof category?.score === 'number' ? category.score : undefined;

  return {
    id,
    label: category?.title ?? categoryLabels[id] ?? id,
    score,
    threshold,
    status: typeof score === 'number' && score >= threshold ? 'OK' : 'Needs attention',
  };
});

const needsAttention = categories.some((category) => category.status !== 'OK');
const metrics = metricAudits
  .map(([id, label]) => {
    const audit = report.audits?.[id];
    return audit
      ? {
          label,
          value: audit.displayValue ?? 'n/a',
          score: typeof audit.score === 'number' ? formatScore(audit.score) : 'n/a',
        }
      : undefined;
  })
  .filter(Boolean);

const opportunities = Object.values(report.audits ?? {})
  .filter((audit) => audit?.details?.type === 'opportunity' && audit.score !== 1)
  .map((audit) => ({
    title: audit.title,
    displayValue: audit.displayValue ?? '',
    savingsMs: Number(audit.details?.overallSavingsMs ?? audit.numericValue ?? 0),
  }))
  .sort((left, right) => right.savingsMs - left.savingsMs)
  .slice(0, 5);

const lines = [
  '# Lighthouse Report',
  '',
  `Target: ${report.finalDisplayedUrl ?? report.requestedUrl ?? process.env.LIGHTHOUSE_TARGET_URL ?? 'unknown'}`,
  `Fetch time: ${report.fetchTime ?? 'unknown'}`,
  `Lighthouse version: ${report.lighthouseVersion ?? 'unknown'}`,
  '',
  '## Scores',
  '',
  '| Category | Score | Threshold | Status |',
  '| --- | ---: | ---: | --- |',
  ...categories.map(
    (category) =>
      `| ${category.label} | ${formatScore(category.score)} | ${formatScore(category.threshold)} | ${category.status} |`,
  ),
  '',
  '## Key Metrics',
  '',
  '| Metric | Value | Score |',
  '| --- | ---: | ---: |',
  ...(metrics.length > 0
    ? metrics.map((metric) => `| ${metric.label} | ${metric.value} | ${metric.score} |`)
    : ['| n/a | n/a | n/a |']),
  '',
  '## Largest Opportunities',
  '',
  ...(opportunities.length > 0
    ? opportunities.map((audit) => `- ${audit.title}${audit.displayValue ? `: ${audit.displayValue}` : ''}`)
    : ['- No major Lighthouse opportunities were reported.']),
  '',
  '## Decision',
  '',
  needsAttention
    ? 'Action required: at least one score is below the agreed threshold. Create or update an issue with concrete fixes.'
    : 'No action required: all tracked scores meet the agreed thresholds.',
  '',
];

await writeFile(summaryPath, `${lines.join('\n')}\n`);

function formatScore(score) {
  return typeof score === 'number' ? Math.round(score * 100).toString() : 'n/a';
}
