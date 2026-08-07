type BeforeAfterPhotosProps = {
  beforeSrc: string;
  afterSrc: string;
};

export function BeforeAfterPhotos({ beforeSrc, afterSrc }: BeforeAfterPhotosProps) {
  return (
    <div className="flex w-full items-center justify-center gap-3 rounded-card border border-neutral-200 bg-white p-4">
      <div className="flex-1 text-center">
        <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={beforeSrc} alt="Hoy" className="h-full w-full object-contain" />
        </div>
        <p className="mt-2 text-sm font-medium text-neutral-600">Hoy</p>
      </div>
      <span aria-hidden="true" className="text-lg text-neutral-400">
        →
      </span>
      <div className="flex-1 text-center">
        <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={afterSrc} alt="En 30 días" className="h-full w-full object-contain" />
        </div>
        <p className="mt-2 text-sm font-medium text-brand">En 30 días</p>
      </div>
    </div>
  );
}
