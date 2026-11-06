import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { Bolt } from '@/components/ui/motifs';
import type { Messages } from '@/lib/i18n/messages/en';

export type LegalDocKey = 'privacy' | 'terms' | 'refunds';
export type LegalSection = Messages['legal']['privacy']['sections'][number];

interface LegalArticleProps {
  doc: LegalDocKey;
  title: string;
  intro: string;
  sections: LegalSection[];
  labels: {
    draft: string;
    draftBody: string;
    updated: ReactNode;
    toc: string;
    questions: string;
    questionsBody: string;
    contact: string;
    deleteData: string;
  };
}

/** Long-form legal layout: 68ch, DM Sans 17px, sticky table of contents from lg up. */
export function LegalArticle({ doc, title, intro, sections, labels }: LegalArticleProps) {
  return (
    <div className="grid-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <aside className="mb-8 lg:mb-0">
          <nav
            aria-label={labels.toc}
            className="rounded-card border-3 border-ink bg-white p-4 shadow-hard-sm lg:sticky lg:top-24"
          >
            <p className="mb-2 font-sticker font-black uppercase">{labels.toc}</p>
            <ol className="flex flex-col gap-1 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex min-h-11 items-center text-blue-deep underline-offset-4 hover:underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="max-w-[68ch] rounded-card border-3 border-ink bg-white p-5 font-body text-[17px] leading-[1.7] shadow-hard-md md:p-8">
          <p
            role="note"
            className="mb-6 flex items-start gap-2 rounded-sticker border-3 border-ink bg-yellow px-4 py-3 font-bold"
          >
            <Bolt size={22} className="shrink-0" />
            <span>
              {labels.draft} <span className="font-normal">{labels.draftBody}</span>
            </span>
          </p>
          <h1 className="font-display text-4xl leading-tight md:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">{labels.updated}</p>
          <p className="mt-6">{intro}</p>
          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-h`}
              className="mt-10 scroll-mt-24"
            >
              <h2 id={`${s.id}-h`} className="font-sticker text-2xl font-black">
                {s.title}
              </h2>
              {s.body.map((p) => (
                <p key={p} className="mt-3">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <div className="mt-12 border-t-2 border-dashed border-ink pt-6">
            <h2 className="font-display text-2xl">{labels.questions}</h2>
            <p className="mt-1 text-muted">{labels.questionsBody}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/contact" className={buttonClasses({ size: 'sm', variant: 'secondary' })}>
                {labels.contact}
              </Link>
              {doc === 'privacy' && (
                <Link
                  href="/contact?topic=data_deletion"
                  className={buttonClasses({ size: 'sm', variant: 'ghost' })}
                >
                  {labels.deleteData}
                </Link>
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
