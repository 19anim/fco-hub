export const AD_SHAPE_SLOTS = {
  square: '7900604498',
  vertical: '1778169412',
  horizontal: '8451268833',
};

export const AD_SHAPE_SIZES = {
  square: { width: 300, height: 250 },
  vertical: { width: 160, height: 600 },
  horizontal: { width: '100%', height: 100 },
};

export const PLACEMENT_AD_SHAPES = {
  player_detail_sidebar: 'horizontal',
  squad_top: 'square',
  squad_bottom: 'square',
  squad_sharing_top: 'square',
  squad_sharing_bottom: 'square',
  videos_top: 'horizontal',
  videos_bottom: 'horizontal',
  calculator_bottom: 'horizontal',
};

export function resolveAdSlotId(placement) {
  const shape = PLACEMENT_AD_SHAPES[placement];
  return shape ? AD_SHAPE_SLOTS[shape] : null;
}

export function resolveAdSize(placement) {
  const shape = PLACEMENT_AD_SHAPES[placement];
  return shape ? AD_SHAPE_SIZES[shape] : null;
}
