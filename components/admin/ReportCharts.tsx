'use client';

/**
 * Report charts. Chart.js is imported only here, and this module is loaded with next/dynamic
 * from the reports route only (bundle rule, §2.5). Colours come from the brand tokens at
 * runtime. Palette validated with the dataviz validator (CVD, normal-vision, contrast pass;
 * muted is deliberately grey for the smallest channel). Every chart has a table view too.
 */
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';
import { useEffect, useRef } from 'react';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();

/** Fixed categorical order (never cycled): identity follows the entity, not its rank. */
export const SERIES_TOKENS = ['blue-deep', 'orange', 'blue', 'orange-deep', 'muted'] as const;

export interface Series {
  label: string;
  data: number[];
  /** Index into SERIES_TOKENS. */
  color: number;
}

export function BarChart({
  labels,
  series,
  stacked,
  horizontal,
  line,
  label,
}: {
  labels: string[];
  series: Series[];
  stacked?: boolean;
  horizontal?: boolean;
  line?: boolean;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const ink = css('ink');
    const grid = css('grid-line');
    const surface = css('white');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const config: ChartConfiguration<'bar' | 'line'> = {
      type: line ? 'line' : 'bar',
      data: {
        labels,
        datasets: series.map((s) => {
          const color = css(SERIES_TOKENS[s.color]!);
          return {
            label: s.label,
            data: s.data,
            backgroundColor: color,
            borderColor: line ? color : surface, // 2px surface gap between fills
            borderWidth: 2,
            borderRadius: stacked ? 0 : 4,
            pointRadius: line ? 4 : 0,
            pointHoverRadius: 6,
            tension: 0,
          };
        }),
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: reduce ? false : { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: series.length > 1,
            labels: { color: ink, boxWidth: 14, font: { weight: 'bold' } },
          },
          tooltip: { backgroundColor: ink, titleColor: surface, bodyColor: surface, padding: 10 },
        },
        scales: {
          x: {
            stacked,
            grid: { color: horizontal ? grid : 'transparent' },
            ticks: { color: ink },
            beginAtZero: true,
          },
          y: {
            stacked,
            grid: { color: horizontal ? 'transparent' : grid },
            ticks: { color: ink, precision: 0 },
            beginAtZero: true,
          },
        },
      },
    };
    const chart = new Chart(canvas.current, config);
    return () => chart.destroy();
  }, [labels, series, stacked, horizontal, line]);
  return (
    <div className="relative h-72">
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}
