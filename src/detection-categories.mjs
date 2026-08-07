export const DETECTION_CATEGORIES = Object.freeze([
  'resolution', 'source', 'visual', 'audio', 'channels', 'languages',
]);

export const DETECTION_MODES = Object.freeze(['markers', 'filename', 'custom']);

const CATEGORY_BITS = Object.freeze(Object.fromEntries(
  DETECTION_CATEGORIES.map((category, index) => [category, 1 << index]),
));

export function encodeFilenameMask(categories = []) {
  let mask = 0;
  for (const category of categories) {
    if (!(category in CATEGORY_BITS)) throw new RangeError(`unknown detection category: ${category}`);
    mask |= CATEGORY_BITS[category];
  }
  return mask;
}

export function decodeFilenameMask(mask) {
  if (!Number.isInteger(mask) || mask < 0 || mask > 0b111111) {
    throw new RangeError('filenameMask must be a six-bit filename mask from 0 through 63.');
  }
  return DETECTION_CATEGORIES.filter((category) => (mask & CATEGORY_BITS[category]) !== 0);
}

export function categoryUsesFilename(mask, category) {
  return (mask & encodeFilenameMask([category])) !== 0;
}
