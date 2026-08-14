import { LANDING, DISCLAIMERS } from '@/lib/content/copy';

export function LegalFooter() {
  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-6 text-center">
      <div className="flex flex-wrap justify-center gap-4">
        <a href="/terms" className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
          {LANDING.footerLinks.terminos}
        </a>
        <a href="/privacy" className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
          {LANDING.footerLinks.privacidad}
        </a>
        <a
          href={`mailto:${LANDING.contactoEmail}`}
          className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
        >
          {LANDING.footerLinks.contacto}
        </a>
      </div>
      <p className="mx-auto mt-4 max-w-sm text-[10px] leading-relaxed text-neutral-500">{DISCLAIMERS.aviso}</p>
      <p className="mx-auto mt-2 max-w-sm text-[10px] leading-relaxed text-neutral-500">{DISCLAIMERS.privacidad}</p>
      <p className="mt-3 text-[10px] text-neutral-400">{LANDING.copyright}</p>
    </div>
  );
}
