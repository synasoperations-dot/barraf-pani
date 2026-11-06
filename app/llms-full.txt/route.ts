import { getBusinessFacts, getMenuForSeo } from '@/lib/business-facts';
import { llmsFullTxt } from '@/lib/seo/llms';

export const revalidate = 300;

/** /llms-full.txt: the summary plus the full menu and prices as text. */
export async function GET() {
  const [facts, menu] = await Promise.all([getBusinessFacts(), getMenuForSeo()]);
  return new Response(llmsFullTxt(facts, menu), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
