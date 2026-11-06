'use client';

// Dev-only tool: labels here are hard-coded English (not shipped to customers).

import { useTranslations } from 'next-intl';
import { Gallery } from '@/components/about/Gallery';
import { OurStuff, StoryQuote } from '@/components/about/parts';
import { Reels } from '@/components/about/Reels';
import { FaqGroups, type FaqGroup } from '@/components/faq/FaqGroups';
import { LegalArticle, type LegalSection } from '@/components/legal/LegalArticle';
import { FactsBlock } from '@/components/site/FactsBlock';
import { buildFacts } from '@/lib/business-facts';
import type { StoreStatus } from '@/lib/contracts';
import { Label, Section } from '../guide';

const hours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '12:00',
  closes: weekday === 0 || weekday >= 5 ? '02:00' : '23:30',
}));
const facts = buildFacts(
  {
    shopPhone: '+920000000000',
    openingHours: hours,
    holidays: [{ date: '2027-03-23', note: null }],
  } as unknown as StoreStatus,
  null,
);

export function ContentSection() {
  const faq = useTranslations('faq');
  const legal = useTranslations('legal');
  return (
    <Section
      id="content"
      title="About, FAQ, legal"
      note="/about parts (story quote, masonry gallery + lightbox, reel facades, our stuff), the facts block (full + footer), FAQ sticker accordions and the legal long-form layout."
    >
      <div className="flex flex-col gap-10">
        <div>
          <Label>Facts block · full</Label>
          <FactsBlock facts={facts} />
        </div>
        <div>
          <Label>Facts block · footer (on ink)</Label>
          <div className="rounded-card bg-ink p-6">
            <FactsBlock facts={facts} variant="footer" />
          </div>
        </div>
        <div>
          <Label>Story quote</Label>
          <StoryQuote />
        </div>
        <div>
          <Label>Gallery (tap a tile: ←/→, Esc, swipe)</Label>
          <Gallery />
        </div>
        <div>
          <Label>Reels (TBC urls → coming soon; no third-party load)</Label>
          <Reels />
        </div>
        <div>
          <Label>Our stuff</Label>
          <OurStuff />
        </div>
        <div>
          <Label>FAQ accordions (first two groups)</Label>
          <FaqGroups
            groups={(faq.raw('groups') as FaqGroup[]).slice(0, 2)}
            jumpLabel={faq('jump')}
          />
        </div>
        <div>
          <Label>Legal layout (privacy, first 3 sections)</Label>
          <LegalArticle
            doc="privacy"
            title={legal('privacy.title')}
            intro={legal('privacy.intro')}
            sections={(legal.raw('privacy.sections') as LegalSection[]).slice(0, 3)}
            labels={{
              draft: legal('draft'),
              draftBody: legal('draftBody'),
              updated: legal('updated', { date: '6 November 2026' }),
              toc: legal('toc'),
              questions: legal('questions'),
              questionsBody: legal('questionsBody'),
              contact: legal('contact'),
              deleteData: legal('deleteData'),
            }}
          />
        </div>
      </div>
    </Section>
  );
}
