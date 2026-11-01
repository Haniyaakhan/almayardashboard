'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// A type-to-filter dropdown — the same style/sizing as every other form select
// in this app, but with a live search since several of these lists (vehicles,
// 270+) are unusable as a plain native <select>.
export function SearchableSelect({ options, value, onChange, placeholder = 'Select…', disabled }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || (o.sublabel ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);

  function selectOption(opt: SearchableSelectOption) {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => { if (!disabled) { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{
          background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        {open ? (
          <>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={selected?.label ?? placeholder}
              style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', width: '100%', fontSize: 'inherit' }}
            />
          </>
        ) : (
          <>
            <span style={{ flex: 1, color: selected ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 280, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--text-muted)' }}>No matches</div>
          ) : (
            filtered.slice(0, 200).map(opt => (
              <div
                key={opt.value}
                onClick={() => selectOption(opt)}
                style={{
                  padding: '8px 12px', fontSize: 12.5, cursor: 'pointer',
                  background: opt.value === value ? 'var(--orange-lt)' : 'transparent',
                  color: opt.value === value ? 'var(--orange)' : 'var(--text-primary)',
                  fontWeight: opt.value === value ? 600 : 400,
                }}
                onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'var(--bg-canvas)'; }}
                onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
                {opt.sublabel && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — {opt.sublabel}</span>}
              </div>
            ))
          )}
          {filtered.length > 200 && (
            <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              {filtered.length - 200} more — keep typing to narrow it down
            </div>
          )}
        </div>
      )}
    </div>
  );
}
