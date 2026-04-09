const DESIGNATION_ALIASES: Record<string, string> = {
  helper: 'helper',
  helpers: 'helper',
  scaffolder: 'scaffolder',
  scalffolder: 'scaffolder',
  sacffolder: 'scaffolder',
};

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeDesignationKey(value: string | null | undefined) {
  const cleaned = (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!cleaned) return 'unspecified';
  return DESIGNATION_ALIASES[cleaned] || cleaned;
}

export function toDisplayDesignation(value: string | null | undefined) {
  const key = normalizeDesignationKey(value);
  if (key === 'unspecified') return 'Unspecified';
  return toTitleCase(key);
}
