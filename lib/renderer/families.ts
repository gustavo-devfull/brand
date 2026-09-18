/** Puro de propósito: o cliente precisa da lista, mas não pode carregar o parser de fontes. */
export const builtinFamilies = ['Cormorant Garamond', 'DM Sans'] as const;
export type BuiltinFamily = (typeof builtinFamilies)[number];
