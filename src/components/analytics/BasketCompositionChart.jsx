import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const formatCurrency = (value) =>
  `£${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BasketCompositionChart({ data }) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;

    return data.map((row) => {
      const healthy = Number(row.healthy || 0);
      const snacks = Number(row.snacks || 0);
      const alcohol = Number(row.alcohol || 0);
      const other = Number(row.other || 0);
      const total = healthy + snacks + alcohol + other;

      return {
        period: row.period,
        healthy,
        snacks,
        alcohol,
        other,
        total,
      };
    });
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Not enough data to show basket composition.
      </div>
    );
  }

  const buildSeriesData = (rows, key) =>
    rows.map((row) => {
      const value = Number((row[key] || 0).toFixed(2));
      const share = row.total > 0 ? Number(((value / row.total) * 100).toFixed(1)) : 0;
      return { value, share, period: row.period };
    });

  const healthySeries = buildSeriesData(chartData, 'healthy');
  const snacksSeries = buildSeriesData(chartData, 'snacks');
  const alcoholSeries = buildSeriesData(chartData, 'alcohol');
  const palette = {
    healthy: '#22c55e',
    snacks: '#f59e0b',
    alcohol: '#ef4444',
  };

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(226,232,240,0.08)' } },
      formatter: (params = []) =>
        params
          .map((p) => {
            const raw = Number(p.data?.value || 0);
            const share = Number(p.data?.share || 0);
            return `${p.marker} ${p.seriesName}: ${formatCurrency(raw)} (${share.toFixed(1)}%)`;
          })
          .join('<br/>'),
    },
    legend: {
      top: 10,
      textStyle: { color: '#cbd5e1', fontSize: 12 },
      icon: 'circle',
      data: ['Healthy', 'Snacks', 'Alcohol'],
    },
    grid: { left: '4%', right: '2%', top: 50, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: chartData.map((row) => row.period),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.4)' } },
      axisLabel: { color: '#cbd5e1', fontSize: 12, interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        formatter: (value) => formatCurrency(value),
        color: '#cbd5e1',
        fontSize: 12,
      },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
    },
    series: [
      {
        name: 'Healthy',
        type: 'bar',
        stack: 'basket',
        barMaxWidth: 38,
        itemStyle: { color: palette.healthy, borderRadius: [6, 6, 0, 0] },
        emphasis: { focus: 'series' },
        data: healthySeries,
      },
      {
        name: 'Snacks',
        type: 'bar',
        stack: 'basket',
        barMaxWidth: 38,
        itemStyle: { color: palette.snacks, borderRadius: [6, 6, 0, 0] },
        emphasis: { focus: 'series' },
        data: snacksSeries,
      },
      {
        name: 'Alcohol',
        type: 'bar',
        stack: 'basket',
        barMaxWidth: 38,
        itemStyle: { color: palette.alcohol, borderRadius: [6, 6, 0, 0] },
        emphasis: { focus: 'series' },
        data: alcoholSeries,
      },
    ],
  };

  return (
    <div className="w-full h-80 rounded-2xl border border-white/10 bg-white/5 p-4">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
