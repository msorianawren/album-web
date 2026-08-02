"use client";

interface AlbumColsSelectProps {
  value?: number;
  defaultValue?: number;
  onChange?: (cols: number) => void;
}

export function AlbumColsSelect({ value, defaultValue = 5, onChange }: AlbumColsSelectProps) {
  const currentValue = value ?? defaultValue;

  return (
    <select
      value={currentValue}
      onChange={(event) => {
        const newCols = Number(event.target.value);
        if (onChange) {
          onChange(newCols);
        }
      }}
      className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary outline-none cursor-pointer transition hover:border-text-primary/40 focus:border-text-primary"
      aria-label="Columns"
    >
      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
        <option key={size} value={size}>{size} columns</option>
      ))}
    </select>
  );
}
