'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { day: string; hours: number }[];
}

export function MachineUsageChart({ data }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-semibold text-white mb-4">Machine Usage — Current Month (hrs/day)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3454" />
          <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
          <Line type="monotone" dataKey="hours" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
