'use client';

type ChoiceCardProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
};

export function ChoiceCard({ label, selected, onSelect }: ChoiceCardProps) {
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
