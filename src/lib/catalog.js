/**
 * Catálogo de cantina: categorías e íconos.
 *
 * El mapa de íconos estaba duplicado en CajaCantina y NuevoTurnoModal, y estaba
 * indexado por id de producto — con una clave que ni siquiera coincidía
 * (`prod_stella` vs `prod_cerveza`), así que la cerveza mostraba un vaso de agua.
 * Ahora el producto guarda un `iconKey` propio, independiente de su id.
 */

import {
  Beer,
  Candy,
  Cookie,
  CupSoda,
  Droplets,
  Dumbbell,
  GlassWater,
  Martini,
  Package,
  Sandwich,
  Shirt,
  Target,
  Volleyball,
  Wine,
} from 'lucide-react';

export const CATEGORIAS = {
  bebidas: 'Bebidas',
  tragos: 'Tragos',
  snacks: 'Snacks',
  servicios: 'Servicios',
};

export const CATEGORIA_OPTIONS = Object.entries(CATEGORIAS).map(([value, label]) => ({
  value,
  label,
}));

/** Categorías cuyo stock no se descuenta: son alquileres que vuelven. */
export const CATEGORIAS_SIN_STOCK = new Set(['servicios']);

export const PRODUCT_ICONS = {
  isotonica: CupSoda,
  gaseosa: CupSoda,
  cerveza: Beer,
  vino: Wine,
  fernet: Martini,
  trago: Martini,
  agua: Droplets,
  cafe: GlassWater,
  snack: Cookie,
  golosina: Candy,
  sandwich: Sandwich,
  pelota: Volleyball,
  pecheras: Shirt,
  paleta: Target,
  equipamiento: Dumbbell,
  otro: Package,
};

export const ICON_OPTIONS = Object.keys(PRODUCT_ICONS).map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

/** Siempre devuelve un componente válido. Una clave desconocida muestra una caja. */
export const iconForProduct = (product) => PRODUCT_ICONS[product?.iconKey] ?? Package;

/** Heurística para sugerir el ícono a partir del nombre al crear un producto. */
export function guessIconKey(nombre = '', categoria = '') {
  const n = nombre.toLowerCase();
  if (/cerveza|stella|quilmes|brahma|ipa|birra/.test(n)) return 'cerveza';
  if (/fernet|gin|vodka|trago|aperol|campari/.test(n)) return 'fernet';
  if (/vino|malbec/.test(n)) return 'vino';
  if (/agua|villavicencio|mineral/.test(n)) return 'agua';
  if (/gatorade|powerade|isot/.test(n)) return 'isotonica';
  if (/coca|sprite|fanta|gaseosa|pepsi/.test(n)) return 'gaseosa';
  if (/papas|lays|snack|chizit|palito|maní/.test(n)) return 'snack';
  if (/alfajor|chocolate|caramelo|golosina/.test(n)) return 'golosina';
  if (/sandwich|lomito|choripán|hamburguesa/.test(n)) return 'sandwich';
  if (/pelota|balón/.test(n)) return 'pelota';
  if (/pechera|camiseta/.test(n)) return 'pecheras';
  if (/paleta|raqueta/.test(n)) return 'paleta';
  if (categoria === 'servicios') return 'equipamiento';
  if (categoria === 'tragos') return 'trago';
  if (categoria === 'snacks') return 'snack';
  if (categoria === 'bebidas') return 'gaseosa';
  return 'otro';
}
