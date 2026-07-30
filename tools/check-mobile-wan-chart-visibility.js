const fs = require('fs');

const root = process.cwd();
const read = (file) => fs.readFileSync(`${root}/${file}`, 'utf8');
const report = JSON.parse(read('_acceptance/panel-runtime-browser/report.json'));
const sourceFoundation = read('src/panel-framework/mobile/mobile-patrol-foundation.css');
const sourcePhone = read('src/panel-framework/mobile/mobile-patrol.css');
const sourceChart = read('src/panel-framework/mobile/MobilePatrolTraffic.tsx');
const boundaryCheck = report.checks.find((item) => item.name?.includes('normal current mobile and desktop verdicts lead with the unproven business boundary'));
const phoneCheck = report.checks.find((item) => item.name?.startsWith('390/375 normal phone keeps WAN signal'));
const checkDetail = phoneCheck?.detail ?? boundaryCheck?.detail;
const normal390 = checkDetail?.normal390 ?? checkDetail?.details?.normal390 ?? checkDetail?.normal?.normal390;
const normal375 = checkDetail?.normal375 ?? checkDetail?.details?.normal375 ?? checkDetail?.normal?.normal375;
const failures = [];

const baseMinHeight = Number(sourceFoundation.match(/\.mp-chart\s*\{[^}]*min-height:\s*(\d+)px/s)?.[1] ?? 0);
const smallMinHeight = Number(sourcePhone.match(/@media\s*\(max-width:\s*389px\)[\s\S]*?\.mp-chart\s*\{[^}]*min-height:\s*(\d+)px/s)?.[1] ?? 0);
if (baseMinHeight < 112) failures.push(`base chart min-height ${baseMinHeight}px < 112px`);
if (smallMinHeight < 104) failures.push(`small-phone chart min-height ${smallMinHeight}px < 104px`);
if (!sourceChart.includes('viewBox="0 0 320 104"')) failures.push('mobile chart viewBox is not 320x104');
if ((normal390?.chartSurfaceRect?.height ?? 0) < 112) failures.push(`normal390 chart surface ${normal390?.chartSurfaceRect?.height ?? 0}px < 112px`);
if ((normal390?.chartRect?.height ?? 0) < 90) failures.push(`normal390 chart plot ${normal390?.chartRect?.height ?? 0}px < 90px`);
if (normal375 && (normal375.chartSurfaceRect?.height ?? 0) < 104) failures.push(`normal375 chart surface ${normal375.chartSurfaceRect?.height ?? 0}px < 104px`);

const result = {
  pass: failures.length === 0,
  contract: 'mobile-wan-chart-visibility-v1',
  expectedRed: failures.length > 0,
  thresholds: { baseMinHeight: 112, smallPhoneMinHeight: 104, plotHeight: 90 },
  observed: {
    baseMinHeight,
    smallMinHeight,
    normal390ChartSurface: normal390?.chartSurfaceRect?.height ?? null,
    normal390ChartPlot: normal390?.chartRect?.height ?? null,
    normal375ChartSurface: normal375?.chartSurfaceRect?.height ?? null,
  },
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
