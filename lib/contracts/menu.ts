import { z } from 'zod';
import { Id, IsoDateTime, LocalizedText, Rupees } from './common';

/* Field names mirror ARCHITECTURE §5.2 in camelCase; the trailing comment is the column. */

/** ADDITION column item_variants.size: pizza size, null elsewhere. */
export const VariantSize = z.enum(['S', 'M', 'L', 'XL']);
export type VariantSize = z.infer<typeof VariantSize>;

/** ADDITION column item_variants.option: label key for two-price items (UI: `variant.<option>`). */
export const VariantOption = z.enum([
  'regular',
  'large',
  'single',
  'double',
  'optionA',
  'optionB',
  'classic',
  'cheese',
]);
export type VariantOption = z.infer<typeof VariantOption>;

/** item_variants */
export const Variant = z.object({
  id: Id, // id
  name: z.string().min(1), // name (unique per item), e.g. "S · Option A"
  size: VariantSize.nullable(), // size (ADDITION)
  option: VariantOption.nullable(), // option (ADDITION)
  price: Rupees, // price: the FULL price for this variant
  isDefault: z.boolean(), // is_default (at most one per item)
  isAvailable: z.boolean(), // is_available
});
export type Variant = z.infer<typeof Variant>;

/** modifiers */
export const Modifier = z.object({
  id: Id, // id
  name: LocalizedText, // name (+ name_ur ADDITION)
  price: Rupees, // price
  isAvailable: z.boolean(), // is_available
});
export type Modifier = z.infer<typeof Modifier>;

/** modifier_groups (+ its modifiers) */
export const ModifierGroup = z
  .object({
    id: Id, // id
    name: LocalizedText, // name
    minSelect: z.number().int().nonnegative(), // min_select
    maxSelect: z.number().int().positive(), // max_select
    modifiers: z.array(Modifier),
  })
  .refine((g) => g.minSelect <= g.maxSelect, { message: 'minSelect must be <= maxSelect' });
export type ModifierGroup = z.infer<typeof ModifierGroup>;

/** categories */
export const Category = z.object({
  id: Id, // id
  slug: z.string().min(1), // slug (unique)
  name: LocalizedText, // name_en / name_ur
  sortOrder: z.number().int(), // sort_order
  isActive: z.boolean(), // is_active
  /** ADDITION parent_id: e.g. Loaded Fries is shown inside the Fries board. */
  parentId: Id.nullable(),
  /** ADDITION image_paths: category photos (storage keys). May be empty. */
  imagePaths: z.array(z.string()),
});
export type Category = z.infer<typeof Category>;

/** menu_items (+ variants and attached modifier group ids from item_modifier_groups) */
export const Item = z.object({
  id: Id, // id
  categoryId: Id, // category_id
  slug: z.string().min(1), // slug (unique)
  name: LocalizedText, // name_en / name_ur
  /** null until the client provides copy; UI must look good without it. */
  description: LocalizedText.nullable(), // description_en / description_ur
  basePrice: Rupees, // base_price (= default variant price)
  /** null → use the category's first image. */
  imagePath: z.string().nullable(), // image_path
  isActive: z.boolean(), // is_active
  isSoldOut: z.boolean(), // is_sold_out
  soldOutUntil: IsoDateTime.nullable(), // sold_out_until
  prepMinutes: z.number().int().positive().nullable(), // prep_minutes
  sortOrder: z.number().int(), // sort_order
  variants: z.array(Variant).min(1),
  modifierGroupIds: z.array(Id), // item_modifier_groups
});
export type Item = z.infer<typeof Item>;

/** combos / combo_items. FEATURE_COMBOS=false in v1; fixture ships empty. */
export const Combo = z.object({
  id: Id,
  slug: z.string().min(1),
  name: LocalizedText,
  price: Rupees,
  items: z.array(z.object({ itemId: Id, variantId: Id, qty: z.number().int().positive() })).min(1),
  isActive: z.boolean(),
});
export type Combo = z.infer<typeof Combo>;

/** GET /api/menu */
export const Menu = z.object({
  categories: z.array(Category),
  items: z.array(Item),
  modifierGroups: z.array(ModifierGroup),
  combos: z.array(Combo),
  updatedAt: IsoDateTime,
});
export type Menu = z.infer<typeof Menu>;

/** Live sold-out toggle on the menu realtime channel (§4.6). */
export const SoldOutEvent = z.object({
  itemId: Id,
  isSoldOut: z.boolean(),
  soldOutUntil: IsoDateTime.nullable(),
});
export type SoldOutEvent = z.infer<typeof SoldOutEvent>;
