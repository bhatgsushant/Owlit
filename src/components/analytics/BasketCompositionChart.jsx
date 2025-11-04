import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const formatCurrency = (value) =>
  `£${Number(value || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const buildSeriesData = (data, key) =>
  data.map((row) => ({
    value: Number((row[`${key}Pct`] || 0).toFixed(2)),
    rawValue: Number(row[key] || 0),
  }));

export default function BasketCompositionChart({ data }) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;

    return data.map((row) => {
      const healthy = Number(row.healthy || 0);
      const snacks = Number(row.snacks || 0);
      const alcohol = Number(row.alcohol || 0);
      const other = Number(row.other || 0);
      const total = healthy + snacks + alcohol + other;
      const safeTotal = total > 0 ? total : 1;

      return {
        period: row.period,
        healthy,
        snacks,
        alcohol,
        other,
        healthyPct: (healthy / safeTotal) * 100,
        snacksPct: (snacks / safeTotal) * 100,
        alcoholPct: (alcohol / safeTotal) * 100,
        otherPct: (other / safeTotal) * 100,
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

  const healthySeries = buildSeriesData(chartData, 'healthy');
  const snacksSeries = buildSeriesData(chartData, 'snacks');
  const alcoholSeries = buildSeriesData(chartData, 'alcohol');
  const otherSeries = buildSeriesData(chartData, 'other');

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        return params
          .map((p) => {
            const raw = p.data?.rawValue || 0;
            return `${p.marker} ${p.seriesName}: ${Number(p.value || 0).toFixed(1)}% (${formatCurrency(raw)})`;
          })
          .join('<br/>');
      },
      axisPointer: {
        type: 'line',
        lineStyle: { color: 'rgba(148, 163, 184, 0.4)' },
      },
    },
    legend: {
      top: 10,
      textStyle: { color: '#cbd5e1', fontSize: 12 },
      icon: 'circle',
    },
    grid: { left: '3%', right: '4%', top: 50, bottom: 30, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.map((row) => row.period),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.4)' } },
      axisLabel: { color: '#cbd5e1', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#cbd5e1', fontSize: 12 },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
    },
    series: [
      {
        name: 'Healthy',
        type: 'line',
        smooth: true,
        stack: 'total',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(34,197,94,0.8)' },
            { offset: 1, color: 'rgba(34,197,94,0.15)' },
          ]),
        },
        lineStyle: { width: 2, color: 'rgba(34,197,94,1)' },
        emphasis: { focus: 'series' },
        showSymbol: false,
        data: healthySeries,
      },
      {
        name: 'Snacks',
        type: 'line',
        smooth: true,
        stack: 'total',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245,158,11,0.8)' },
            { offset: 1, color: 'rgba(245,158,11,0.15)' },
          ]),
        },
        lineStyle: { width: 2, color: 'rgba(245,158,11,1)' },
        emphasis: { focus: 'series' },
        showSymbol: false,
        data: snacksSeries,
      },
      {
        name: 'Alcohol',
        type: 'line',
        smooth: true,
        stack: 'total',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(239,68,68,0.8)' },
            { offset: 1, color: 'rgba(239,68,68,0.15)' },
          ]),
        },
        lineStyle: { width: 2, color: 'rgba(239,68,68,1)' },
        emphasis: { focus: 'series' },
        showSymbol: false,
        data: alcoholSeries,
      },
      {
        name: 'Other',
        type: 'line',
        smooth: true,
        stack: 'total',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(139,92,246,0.8)' },
            { offset: 1, color: 'rgba(139,92,246,0.15)' },
          ]),
        },
        lineStyle: { width: 2, color: 'rgba(139,92,246,1)' },
        emphasis: { focus: 'series' },
        showSymbol: false,
        data: otherSeries,
      },
    ],
  };

  return (
    <div className="w-full h-80 rounded-2xl border border-white/10 bg-white/5 p-4">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
