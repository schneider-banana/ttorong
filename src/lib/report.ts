// 성장 리포트 HTML 생성기
// - 소아과 제출용 인쇄 친화적 리포트 (흰 배경, 검은 글씨)
// - 성장곡선은 차트 라이브러리 없이 SVG 문자열로 직접 생성
import { getVaccinationSchedule } from "./vaccination";
import type { GrowthRecord } from "../types";

/** 성장 리포트 입력값 */
export interface GrowthReportInput {
  /** 아이 이름 */
  childName: string;
  /** 생년월일 (YYYY-MM-DD) — 모르면 null */
  birthDate: string | null;
  /** 성장 기록 (측정일 오름차순이 아니어도 됨, 내부에서 정렬) */
  records: GrowthRecord[];
  /** 리포트 생성일 (YYYY-MM-DD) */
  today: string;
}

/** HTML 이스케이프 (아이 이름 등 사용자 입력값) */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 수치 표시: 없으면 "-" */
function num(value: number | undefined): string {
  return value === undefined ? "-" : String(value);
}

/** 숫자 눈금 포맷 (소수점 불필요한 0 제거) */
function fmtTick(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** 꺾은선 점 문자열 "x,y x,y ..." 생성 */
function polylinePoints(pts: { x: number; y: number }[]): string {
  return pts
    .map((p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`)
    .join(" ");
}

/**
 * 성장곡선 SVG (이중축 1개):
 * - 왼쪽 축(파랑): 키(cm), 오른쪽 축(빨강): 몸무게(kg)
 * - 데이터가 1건이면 꺾은선이 아니라 점만 표시
 * - 그릴 수 있는 값이 하나도 없으면 "기록 없음" 문구
 */
function buildChartSvg(records: GrowthRecord[]): string {
  const dated = records
    .map((r) => ({
      ...r,
      t: new Date(`${r.measuredDate}T00:00:00`).getTime(),
    }))
    .filter((r) => r.heightCm !== undefined || r.weightKg !== undefined)
    .sort((a, b) => a.measuredDate.localeCompare(b.measuredDate));

  if (dated.length === 0) {
    return `<p class="empty">성장 기록이 없습니다.</p>`;
  }

  const W = 640;
  const H = 320;
  const padL = 48;
  const padR = 48;
  const padT = 20;
  const padB = 46;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  // X축: 측정일 (1건이면 앞뒤로 하루씩 여유를 둬 점이 가운데 오게)
  const times = dated.map((r) => r.t);
  let tMin = Math.min(...times);
  let tMax = Math.max(...times);
  if (tMin === tMax) {
    tMin -= 86_400_000;
    tMax += 86_400_000;
  }
  const x = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * iw;

  // 값 범위 (위아래 15% 여유, 단일값이면 ±1)
  const valueRange = (vals: number[]): [number, number] => {
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.15;
    return [lo - pad, hi + pad];
  };

  const heightPts = dated
    .filter((r) => r.heightCm !== undefined)
    .map((r) => ({ x: x(r.t), y: 0, v: r.heightCm as number }));
  const weightPts = dated
    .filter((r) => r.weightKg !== undefined)
    .map((r) => ({ x: x(r.t), y: 0, v: r.weightKg as number }));

  const [hLo, hHi] = heightPts.length
    ? valueRange(heightPts.map((p) => p.v))
    : [0, 1];
  const [wLo, wHi] = weightPts.length
    ? valueRange(weightPts.map((p) => p.v))
    : [0, 1];
  const yh = (v: number) => padT + ih - ((v - hLo) / (hHi - hLo)) * ih;
  const yw = (v: number) => padT + ih - ((v - wLo) / (wHi - wLo)) * ih;
  heightPts.forEach((p) => (p.y = yh(p.v)));
  weightPts.forEach((p) => (p.y = yw(p.v)));

  const TICKS = 5;
  const hTicks = Array.from(
    { length: TICKS },
    (_, i) => hLo + ((hHi - hLo) / (TICKS - 1)) * i
  );
  const wTicks = Array.from(
    { length: TICKS },
    (_, i) => wLo + ((wHi - wLo) / (TICKS - 1)) * i
  );

  // X축 눈금: 최대 6개, 균등 간격으로 선택 (1건이면 해당 1개만)
  const xIdx: number[] = [];
  const xCount = Math.min(dated.length, 6);
  for (let i = 0; i < xCount; i++) {
    xIdx.push(
      xCount === 1 ? 0 : Math.round((i * (dated.length - 1)) / (xCount - 1))
    );
  }

  const HEIGHT_COLOR = "#2563eb";
  const WEIGHT_COLOR = "#dc2626";

  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="성장곡선">`;

  // 가로 그리드
  hTicks.forEach((t) => {
    const y = yh(t);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5e5e5" stroke-width="1"/>`;
  });

  // 테두리 축
  svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + ih}" stroke="#333" stroke-width="1.5"/>`;
  svg += `<line x1="${W - padR}" y1="${padT}" x2="${W - padR}" y2="${padT + ih}" stroke="#333" stroke-width="1.5"/>`;
  svg += `<line x1="${padL}" y1="${padT + ih}" x2="${W - padR}" y2="${padT + ih}" stroke="#333" stroke-width="1.5"/>`;

  // 왼쪽 눈금: 키(cm)
  hTicks.forEach((t) => {
    const y = yh(t);
    svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#333">${fmtTick(t)}</text>`;
  });
  svg += `<text x="12" y="${padT + ih / 2}" font-size="12" fill="${HEIGHT_COLOR}" text-anchor="middle" transform="rotate(-90 12 ${padT + ih / 2})">키 (cm)</text>`;

  // 오른쪽 눈금: 몸무게(kg)
  wTicks.forEach((t) => {
    const y = yw(t);
    svg += `<text x="${W - padR + 6}" y="${y + 4}" text-anchor="start" font-size="11" fill="#333">${fmtTick(t)}</text>`;
  });
  svg += `<text x="${W - 12}" y="${padT + ih / 2}" font-size="12" fill="${WEIGHT_COLOR}" text-anchor="middle" transform="rotate(90 ${W - 12} ${padT + ih / 2})">몸무게 (kg)</text>`;

  // X축 눈금: 측정일 (MM-DD)
  xIdx.forEach((i) => {
    const r = dated[i];
    const label = r.measuredDate.slice(5);
    svg += `<text x="${x(r.t)}" y="${padT + ih + 20}" text-anchor="middle" font-size="11" fill="#333">${label}</text>`;
  });

  // 꺾은선 + 점 (1건이면 점만)
  if (heightPts.length > 0) {
    if (heightPts.length > 1) {
      svg += `<polyline points="${polylinePoints(heightPts)}" fill="none" stroke="${HEIGHT_COLOR}" stroke-width="2.5"/>`;
    }
    heightPts.forEach((p) => {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${HEIGHT_COLOR}"/>`;
    });
  }
  if (weightPts.length > 0) {
    if (weightPts.length > 1) {
      svg += `<polyline points="${polylinePoints(weightPts)}" fill="none" stroke="${WEIGHT_COLOR}" stroke-width="2.5"/>`;
    }
    weightPts.forEach((p) => {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${WEIGHT_COLOR}"/>`;
    });
  }

  // 범례
  const legendY = 8;
  svg += `<rect x="${padL}" y="${legendY}" width="12" height="12" fill="${HEIGHT_COLOR}"/><text x="${padL + 16}" y="${legendY + 11}" font-size="12" fill="#333">키 (cm)</text>`;
  const lx2 = padL + 110;
  svg += `<rect x="${lx2}" y="${legendY}" width="12" height="12" fill="${WEIGHT_COLOR}"/><text x="${lx2 + 16}" y="${legendY + 11}" font-size="12" fill="#333">몸무게 (kg)</text>`;

  svg += `</svg>`;
  return svg;
}

/** 성장 기록 표 행 */
function buildRecordRows(records: GrowthRecord[]): string {
  if (records.length === 0) {
    return `<tr><td colspan="4" class="empty">성장 기록이 없습니다.</td></tr>`;
  }
  return records
    .map(
      (r) =>
        `<tr><td>${esc(r.measuredDate)}</td><td>${num(r.heightCm)}</td><td>${num(r.weightKg)}</td><td>${num(r.headCm)}</td></tr>`
    )
    .join("\n");
}

/** 예방접종 일정 표 (생년월일 미상이면 안내 문구) */
function buildVaccinationTable(birthDate: string | null): string {
  if (!birthDate) {
    return `<p class="empty">생년월일을 알 수 없어 접종 일정을 표시할 수 없습니다.</p>`;
  }
  const rows = getVaccinationSchedule(birthDate)
    .map(
      (d) =>
        `<tr><td>${esc(d.vaccine)}</td><td>${esc(d.dose)}</td><td>${esc(d.dueDate)}</td></tr>`
    )
    .join("\n");
  return `<table>
    <thead><tr><th>백신</th><th>차수</th><th>예정일</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="note">※ 질병관리청 국가예방접종 표준 일정(0~24개월) 기준 예정일이며, 접종 완료 여부는 별도 기록이 없어 표시하지 않습니다. 접종 전 의료기관에 확인하세요.</p>`;
}

/** 소아과 제출용 성장 리포트 HTML 생성 */
export function buildGrowthReportHtml(input: GrowthReportInput): string {
  const { childName, birthDate, today } = input;
  const records = [...input.records].sort((a, b) =>
    a.measuredDate.localeCompare(b.measuredDate)
  );

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>성장 리포트 - ${esc(childName)}</title>
<style>
  body { font-family: -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: #000; background: #fff; margin: 32px; line-height: 1.6; }
  h1 { font-size: 26px; margin: 0 0 8px; }
  h2 { font-size: 18px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #000; }
  .meta { font-size: 14px; margin: 0 0 4px; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { border: 1px solid #666; padding: 7px 10px; font-size: 13px; text-align: center; }
  th { background: #f2f2f2; font-weight: 700; }
  .empty { color: #555; padding: 16px; }
  .note { font-size: 12px; color: #444; margin-top: 8px; }
  svg { max-width: 100%; height: auto; display: block; margin: 8px auto 0; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>성장 리포트</h1>
  <p class="meta"><strong>아이 이름:</strong> ${esc(childName)}</p>
  <p class="meta"><strong>생년월일:</strong> ${birthDate ? esc(birthDate) : "미상"}</p>
  <p class="meta"><strong>리포트 생성일:</strong> ${esc(today)}</p>

  <h2>성장 기록</h2>
  <table>
    <thead><tr><th>측정일</th><th>키 (cm)</th><th>몸무게 (kg)</th><th>머리둘레 (cm)</th></tr></thead>
    <tbody>
${buildRecordRows(records)}
    </tbody>
  </table>

  <h2>성장곡선</h2>
  ${buildChartSvg(records)}

  <h2>예방접종 일정</h2>
  ${buildVaccinationTable(birthDate)}
</body>
</html>`;
}
