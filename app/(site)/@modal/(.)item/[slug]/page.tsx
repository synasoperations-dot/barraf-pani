import { ItemDetail } from '@/components/item/ItemDetail';

/**
 * /item/[slug] intercepted from inside the site: opens as a Sheet over the current page. It reads
 * the client menu cache (no server round trip), so the photo morph lands in the same commit.
 */
export default async function ItemSheet({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ItemDetail slug={slug} mode="sheet" />;
}
