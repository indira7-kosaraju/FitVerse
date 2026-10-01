import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

const VARS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-grid', 'text-muted', 'surface', 'border', 'text'];

/**
 * Recharts writes colours into SVG attributes, where CSS var() isn't reliable,
 * so resolve the theme tokens to concrete values (recomputed on theme change).
 *
 *   const c = useChartColors();
 *   <Line stroke={c.series[0]} /> <CartesianGrid stroke={c.grid} />
 */
export default function useChartColors() {
  const { theme } = useTheme();

  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const v = Object.fromEntries(VARS.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]));
    return {
      series: [v['chart-1'], v['chart-2'], v['chart-3'], v['chart-4'], v['chart-5']],
      grid: v['chart-grid'],
      axis: v['text-muted'],
      text: v.text,
      tooltipBg: v.surface,
      tooltipBorder: v.border,
      tooltipStyle: {
        background: v.surface,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        color: v.text,
        fontSize: 13,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      },
      tickStyle: { fill: v['text-muted'], fontSize: 12 },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
