import { getBusinessFacts } from '@/lib/business-facts';
import { llmsTxt } from '@/lib/seo/llms';

export const revalidate = 300;

/** /llms.txt: summary for AI assistants, from business facts. */
export async function GET() {
  return new Response(llmsTxt(await getBusinessFacts()), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
