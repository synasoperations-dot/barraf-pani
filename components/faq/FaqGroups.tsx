import type { Messages } from '@/lib/i18n/messages/en';
import { Bolt } from '@/components/ui/motifs';
import { tilt } from '@/lib/tilt';

export type FaqGroup = Messages['faq']['groups'][number];

/** Grouped sticker accordions on native <details>/<summary> (no JS, keyboard and screen-reader ready). */
export function FaqGroups({ groups, jumpLabel }: { groups: FaqGroup[]; jumpLabel: string }) {
  return (
    <>
      <nav aria-label={jumpLabel} className="flex flex-wrap justify-center gap-3">
        {groups.map((g, i) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            style={{ rotate: tilt(i % 2 ? 1.5 : -1.5) }}
            className="inline-flex min-h-11 press items-center rounded-chip border-2 border-ink bg-white px-3 font-sticker font-black shadow-hard-sm [--press-x:3px] [--press-y:3px]"
          >
            {g.title}
          </a>
        ))}
      </nav>
      <div className="mt-12 flex flex-col gap-12">
        {groups.map((g, gi) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-24">
            <h2
              id={`${g.id}-h`}
              className="mb-5 inline-flex items-center gap-2 rounded-sticker border-3 border-ink bg-yellow px-4 py-1 font-sticker text-2xl font-black shadow-sticker"
              style={{ rotate: tilt(gi % 2 ? 1.5 : -2) }}
            >
              <Bolt size={22} />
              {g.title}
            </h2>
            <div className="flex flex-col gap-4">
              {g.items.map((it) => (
                <details
                  key={it.q}
                  className="group rounded-card border-3 border-ink bg-white shadow-hard-md open:shadow-hard-sm"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-bold [&::-webkit-details-marker]:hidden">
                    <span>{it.q}</span>
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-yellow font-display text-2xl leading-none transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="border-t-2 border-dashed border-ink px-5 py-4 text-muted">{it.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
