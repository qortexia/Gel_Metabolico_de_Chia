'use client';

type ChoiceCardProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  image?: string;
  sublabel?: string;
  // Renders a checkbox-style photo card (label below the image, small square
  // indicator in the corner) instead of the single-select styles below —
  // used for multi-select steps like 'area'.
  checkbox?: boolean;
};

export function ChoiceCard({ label, selected, onSelect, image, sublabel, checkbox }: ChoiceCardProps) {
  if (image && checkbox) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`overflow-hidden rounded-card border-2 bg-white text-left transition-transform active:scale-[0.98] ${
          selected ? 'border-brand' : 'border-neutral-200'
        }`}
      >
        <span className="relative block aspect-square w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-cover" />
          <span
            aria-hidden="true"
            className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm text-white ${
              selected ? 'border-brand bg-brand' : 'border-white bg-white/80'
            }`}
          >
            {selected ? '✓' : null}
          </span>
        </span>
        <span className="block p-3 font-semibold">{label}</span>
      </button>
    );
  }

  if (image && sublabel) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex w-full items-center gap-3 rounded-card border-2 p-3 text-left transition-transform active:scale-[0.98] ${
          selected ? 'border-brand bg-brand/5' : 'border-neutral-200 bg-white'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />
        <span className="flex-1">
          <span className="block font-semibold">{label}</span>
          <span className="block text-sm text-neutral-500">{sublabel}</span>
        </span>
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm text-white ${
            selected ? 'border-brand bg-brand' : 'border-neutral-300 bg-white'
          }`}
        >
          {selected ? '✓' : null}
        </span>
      </button>
    );
  }

  if (image) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`aspect-square w-full overflow-hidden rounded-card border-4 bg-neutral-100 transition-transform active:scale-[0.98] ${
          selected ? 'border-brand' : 'border-neutral-200'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={label} className="h-full w-full object-cover" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full min-h-[44px] rounded-card border px-4 py-3 text-left text-base transition-transform active:scale-[0.98] ${
        selected ? 'border-brand bg-brand/10 font-semibold' : 'border-neutral-200 bg-white'
      }`}
    >
      {label}
    </button>
  );
}
