import type { ScoreBreakdown } from './windi-data';

export const scoreLabels: Array<[keyof ScoreBreakdown, string, number]> = [
  ['utility', 'Tính thực dụng & hiệu quả', 50],
  ['setup', 'Cài đặt dễ dàng', 10],
  ['originality', 'Độc đáo & sáng tạo', 20],
  ['adoption', 'Mức độ đón nhận', 20],
];

export function calculateWindiScore(score: ScoreBreakdown) {
  return scoreLabels.reduce((total, [key, , maximum]) => {
    const value = score[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maximum) {
      throw new Error(`Điểm ${key} phải nằm trong khoảng 0–${maximum}.`);
    }
    return total + value;
  }, 0);
}
