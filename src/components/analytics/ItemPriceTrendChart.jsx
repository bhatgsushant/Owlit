  import React from 'react';
  import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } from 'recharts';

  const tooltipStyles = {
    background: 'rgba(15, 23, 42, 0.92)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: '8px 10px',
  };

  const currency = (v) => `£${Number(v || 0).toFixed(2)}`;

  export default function ItemPriceTrendChart({ data, itemName }) {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Not enough price history yet.
        </div>
      );
    }

    // ✅ Ensure chronological left → right
    data = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    // ✅ Insight: Compare latest price to average
    const avg =
      data.reduce((acc, d) => acc + (d.unit_price || 0), 0) / data.length;
    const change = ((data[data.length - 1].unit_price - avg) / avg) * 100;

    return (
      <div className="w-full h-72 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium text-slate-200 mb-1">
          Price Trend: <span className="text-emerald-300">{itemName}</span>
        </div>

        <div className="text-xs mb-3 text-slate-400">
          {change > 0
            ? `↑ ${change.toFixed(1)}% more expensive than usual`
            : `↓ ${Math.abs(change).toFixed(1)}% cheaper than usual`}
        </div>

        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={data}>
            {/* ✅ Soft gradient shading under line */}
            <defs>
              <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" />

            <XAxis
              dataKey="date"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />

            <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} width={50} />

            <Tooltip
              contentStyle={tooltipStyles}
              labelFormatter={(d) =>
                new Date(d).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                })
              }
              formatter={(value) => [currency(value), 'Unit Price']}
            />

            <Line
              dataKey="unit_price"
              type="monotone"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#priceArea)"
              dot={{ r: 2.5, fill: '#22d3ee' }}
              activeDot={{ r: 5, fill: '#38bdf8', strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
