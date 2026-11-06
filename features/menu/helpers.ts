/** Pure menu selectors shared by Home, Menu, Item detail and the cart. */
import type { Category, Item, Menu, Modifier, ModifierGroup, Variant } from '@/lib/contracts';

/** Active categories in printed-menu order. */
export const activeCategories = (menu: Menu): Category[] =>
  menu.categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

/** Top-level categories (children like Loaded Fries render inside their parent's board). */
export const topCategories = (menu: Menu) => activeCategories(menu).filter((c) => !c.parentId);

export const childCategories = (menu: Menu, parentId: string) =>
  activeCategories(menu).filter((c) => c.parentId === parentId);

export const itemsIn = (menu: Menu, categoryId: string): Item[] =>
  menu.items
    .filter((i) => i.isActive && i.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

export const findItemBySlug = (menu: Menu, slug: string) =>
  menu.items.find((i) => i.slug === slug && i.isActive) ?? null;

export const findItemById = (menu: Menu, id: string) => menu.items.find((i) => i.id === id) ?? null;

export const categoryOf = (menu: Menu, item: Item) =>
  menu.categories.find((c) => c.id === item.categoryId) ?? null;

/** Item photo, else its category's first photo, else the parent category's. Null for Dips/Sides. */
export function itemImage(menu: Menu, item: Item): string | null {
  if (item.imagePath) return item.imagePath;
  const cat = categoryOf(menu, item);
  if (cat?.imagePaths[0]) return cat.imagePaths[0];
  const parent = cat?.parentId ? menu.categories.find((c) => c.id === cat.parentId) : null;
  return parent?.imagePaths[0] ?? null;
}

export const modifierGroupsFor = (menu: Menu, item: Item): ModifierGroup[] =>
  item.modifierGroupIds
    .map((id) => menu.modifierGroups.find((g) => g.id === id))
    .filter((g): g is ModifierGroup => Boolean(g));

/** Items with a required choice (e.g. Honey Glazed Wings → Regular/Spicy) open Item detail. */
export const hasRequiredChoice = (menu: Menu, item: Item) =>
  modifierGroupsFor(menu, item).some((g) => g.minSelect > 0);

export const availableVariants = (item: Item): Variant[] =>
  item.variants.filter((v) => v.isAvailable);

export const defaultVariant = (item: Item): Variant =>
  item.variants.find((v) => v.isDefault && v.isAvailable) ??
  availableVariants(item)[0] ??
  item.variants[0]!;

export const isOrderable = (item: Item) => !item.isSoldOut && availableVariants(item).length > 0;

/** Display estimate only; the server quote is the real price (§2.4). */
export const unitEstimate = (variant: Variant, modifiers: Pick<Modifier, 'price'>[]) =>
  variant.price + modifiers.reduce((n, m) => n + m.price, 0);

/** Apply a live sold-out toggle (realtime §4.6) to a cached menu. */
export function applySoldOut(
  menu: Menu,
  e: { itemId: string; isSoldOut: boolean; soldOutUntil: string | null },
): Menu {
  return {
    ...menu,
    items: menu.items.map((i) =>
      i.id === e.itemId ? { ...i, isSoldOut: e.isSoldOut, soldOutUntil: e.soldOutUntil } : i,
    ),
  };
}
