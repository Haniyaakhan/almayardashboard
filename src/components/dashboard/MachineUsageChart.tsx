'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { day: string; hours: number }[];
}

export function MachineUsageChart({ data }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#1e2336', border: '1px solid #2d3454' }}>
      <h3 className="text-sm font-semibold text-white mb-4">Machine Usage — Current Month (hrs/day)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3454" />
          <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3454', borderRadius: 8, color: '#f1f5f9' }} />
          <Line type="monotone" dataKey="hours" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
