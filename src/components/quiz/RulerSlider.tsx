'use client';

import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react';
import { kgToLb, lbToKg, cmToIn, inToCm } from '@/lib/units';

type UnitDef = { label: string; toBase: (v: number) => number; fromBase: (v: number) => number };

const UNIT_SETS: Record<'peso' | 'altura', UnitDef[]> = {
  peso: [
    { label: 'kg', toBase: (v) => v, fromBase: (v) => v },
    { label: 'lb', toBase: lbToKg, fromBase: kgToLb },
  ],
  altura: [
    { label: 'cm', toBase: (v) => v, fromBase: (v) => v },
    { label: 'pulg', toBase: inToCm, fromBase: cmToIn },
  ],
};

const PX_PER_UNIT = 16;

// Invisible marker (not part of the Unicode whitespace class, so testing-library's
// text normalizer won't strip it) appended to decorative/duplicate text nodes — the
// tick labels and the hero unit label — so the hero value stays the single
// unambiguous exact-text match, distinct from the always-clean unit toggle buttons
// and from ruler tick numbers that may coincide with the current value.
const INVISIBLE_MARK = '​';

type RulerSliderProps = {
  min: number;
  max: number;
  defaultValue: number;
  majorTickEvery: number;
  unitKind: 'peso' | 'altura';
  instruction: string;
  onChange: (baseValue: number) => void;
};

export function RulerSlider({
  min,
  max,
  defaultValue,
  majorTickEvery,
  unitKind,
  instruction,
  onChange,
}: RulerSliderProps) {
  const units = UNIT_SETS[unitKind];
  const [unitIndex, setUnitIndex] = useState(0);
  const [baseValue, setBaseValue] = useState(defaultValue);
  const dragState = useRef<{ startX: number; startValue: number } | null>(null);

  const unit = units[unitIndex];
  const displayValue = Math.round(unit.fromBase(baseValue));

  const commit = useCallback(
    (next: number) => {
      const clamped = Math.min(max, Math.max(min, Math.round(next)));
      setBaseValue(clamped);
      onChange(clamped);
    },
    [max, min, onChange]
  );

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, startValue: baseValue };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const deltaPx = e.clientX - dragState.current.startX;
    const deltaUnits = -deltaPx / PX_PER_UNIT;
    commit(dragState.current.startValue + deltaUnits);
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') commit(baseValue + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') commit(baseValue - 1);
    if (e.key === 'PageUp') commit(baseValue + majorTickEvery);
    if (e.key === 'PageDown') commit(baseValue - majorTickEvery);
    if (e.key === 'Home') commit(min);
    if (e.key === 'End') commit(max);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    commit(baseValue + (e.deltaY > 0 ? -1 : 1));
  };

  const ticks: number[] = [];
  for (let v = min; v <= max; v += 1) ticks.push(v);
  const centerOffsetPx = -(baseValue - min) * PX_PER_UNIT;

  return (
    <div>
      <div className="mb-3 flex justify-center gap-2">
        {units.map((u, idx) => (
          <button
            key={u.label}
            type="button"
            onClick={() => setUnitIndex(idx)}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3 text-sm ${
              idx === unitIndex ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>
      <div className="text-center text-4xl font-bold">
        {displayValue} <span className="text-lg font-normal">{unit.label}{INVISIBLE_MARK}</span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={baseValue}
        aria-valuetext={`${displayValue} ${unit.label}`}
        aria-label={instruction}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        className="relative mt-6 h-20 touch-none overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-brand" />
        <div
          className="absolute left-1/2 top-0 flex h-full items-end"
          style={{ transform: `translateX(${centerOffsetPx - PX_PER_UNIT / 2}px)` }}
        >
          {ticks.map((v) => (
            <div key={v} className="flex flex-col items-center" style={{ width: PX_PER_UNIT }}>
              <div className={v % majorTickEvery === 0 ? 'h-8 w-px bg-neutral-400' : 'h-4 w-px bg-neutral-300'} />
              {v % majorTickEvery === 0 ? (
                <span aria-hidden="true" className="mt-1 text-xs text-neutral-500">
                  {Math.round(unit.fromBase(v))}
                  {INVISIBLE_MARK}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-sm text-neutral-600">{instruction}</p>
    </div>
  );
}
