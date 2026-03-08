'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { day: string; hours: number }[];
}

export function MachineUsageChart({ data }: Props) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 13,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0ece6',
        fontSize: 13, fontWeight: 600,
        color: 'var(--text-primary)',
      }}>Machine Usage — Current Month (hrs/day)</div>
      <div style={{ padding: '12px 16px' }}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }} />
            <Line type="monotone" dataKey="hours" stroke="var(--teal)" strokeWidth={2} dot={{ fill: 'var(--teal)', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
