import { z } from 'zod';
import { Id, IsoDateTime, LocalizedText, Rupees } from './common';

/** Pizza sizes. Null on non-pizza variants. */
export const VariantSize = z.enum(['S', 'M', 'L', 'XL']);
export type VariantSize = z.infer<typeof VariantSize>;

/**
 * Option label for two-price items. The UI translates it with `variant.<option>`.
 * Null for single-price items.
 */
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

/** A purchasable size/option of an item. `price` is the full price for that variant. */
export const Variant = z.object({
  id: Id,
  size: VariantSize.nullable(),
  option: VariantOption.nullable(),
  price: Rupees,
  isDefault: z.boolean(),
  isAvailable: z.boolean(),
});
export type Variant = z.infer<typeof Variant>;

export const Modifier = z.object({
  id: Id,
  name: LocalizedText,
  price: Rupees,
  isAvailable: z.boolean(),
});
export type Modifier = z.infer<typeof Modifier>;

export const ModifierGroup = z
  .object({
    id: Id,
    name: LocalizedText,
    minSelect: z.number().int().nonnegative(),
    maxSelect: z.number().int().positive(),
    modifiers: z.array(Modifier),
  })
  .refine((g) => g.minSelect <= g.maxSelect, { message: 'minSelect must be <= maxSelect' });
export type ModifierGroup = z.infer<typeof ModifierGroup>;

export const Subsection = z.object({ slug: z.string().min(1), name: LocalizedText });
export type Subsection = z.infer<typeof Subsection>;

export const Category = z.object({
  id: Id,
  slug: z.string().min(1),
  name: LocalizedText,
  sortOrder: z.number().int(),
  /** Public image paths. May be empty (e.g. Dips): UI must look good without a photo. */
  images: z.array(z.string()),
  /** e.g. Fries → "Loaded Fries". Items point at one with `subsection`. */
  subsections: z.array(Subsection),
  isActive: z.boolean(),
});
export type Category = z.infer<typeof Category>;

export const Item = z.object({
  id: Id,
  slug: z.string().min(1),
  categoryId: Id,
  subsection: z.string().nullable(),
  name: LocalizedText,
  /** Null until the client provides copy. UI must look good without it. */
  description: LocalizedText.nullable(),
  /** Public image path; null → fall back to the category's first image. */
  image: z.string().nullable(),
  variants: z.array(Variant).min(1),
  modifierGroupIds: z.array(Id),
  isActive: z.boolean(),
  isSoldOut: z.boolean(),
  soldOutUntil: IsoDateTime.nullable(),
  prepMinutes: z.number().int().positive().nullable(),
  sortOrder: z.number().int(),
});
export type Item = z.infer<typeof Item>;

/** Meals and combos. Behind FEATURE_COMBOS=false in v1; fixture ships empty. */
export const Combo = z.object({
  id: Id,
  slug: z.string().min(1),
  kind: z.enum(['meal', 'combo']),
  name: LocalizedText,
  description: LocalizedText.nullable(),
  image: z.string().nullable(),
  price: Rupees,
  items: z.array(z.object({ itemId: Id, variantId: Id, qty: z.number().int().positive() })).min(1),
  isActive: z.boolean(),
});
export type Combo = z.infer<typeof Combo>;

export const Menu = z.object({
  categories: z.array(Category),
  items: z.array(Item),
  modifierGroups: z.array(ModifierGroup),
  combos: z.array(Combo),
  updatedAt: IsoDateTime,
});
export type Menu = z.infer<typeof Menu>;

/** Live sold-out toggle pushed over realtime. */
export const SoldOutEvent = z.object({
  itemId: Id,
  isSoldOut: z.boolean(),
  soldOutUntil: IsoDateTime.nullable(),
});
export type SoldOutEvent = z.infer<typeof SoldOutEvent>;
