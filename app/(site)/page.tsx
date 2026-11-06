import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { BoltPair, Rings, Wave } from '@/components/ui/motifs';

// Placeholder home so the shell has something to wrap. The real Home page is built in prompt 2.
export default async function HomePage() {
  const t = await getTranslations();
  return (
    <>
      <Rings className="px-4 pt-16 pb-20 text-center md:pt-24 md:pb-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <BoltPair side="start" scale={1.4} />
            <h1 className="font-display text-5xl leading-[0.95] text-white headline md:text-7xl">
              {t('home.headline')}
            </h1>
            <BoltPair side="end" scale={1.4} />
          </div>
          <p className="max-w-md rounded-sticker border-3 border-ink bg-white px-4 py-2 font-medium text-ink shadow-hard-sm">
            {t('home.sub')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/menu" className={buttonClasses({ size: 'lg' })}>
              {t('nav.orderNow')}
            </Link>
            {process.env.NODE_ENV !== 'production' && (
              <Link href="/dev/ui" className={buttonClasses({ size: 'lg', variant: 'ghost' })}>
                Style guide
              </Link>
            )}
          </div>
        </div>
      </Rings>
      <Wave preset="gentle" fillClassName="fill-paper" className="relative -mt-6 md:-mt-10" />
      <p className="px-4 py-10 text-center text-muted">{t('home.comingSoon')}</p>
    </>
  );
}
