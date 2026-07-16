import tacticsData from './fc_online_tactics.json';

const GROUPS_BY_POSITION = {};
Object.values(tacticsData.positions).forEach((group) => {
  group.position_codes.forEach((code) => {
    GROUPS_BY_POSITION[code] = group;
  });
});

export function getInstructionGroup(pos) {
  return GROUPS_BY_POSITION[String(pos || '').toUpperCase()] || null;
}

export function getDefaultInstructions(pos) {
  const group = getInstructionGroup(pos);
  if (!group) return {};
  const result = {};
  group.categories.forEach((category) => {
    const defaultOption = category.options.find((o) => o.is_default) || category.options[0];
    if (defaultOption) result[category.category_code] = defaultOption.option_code;
  });
  return result;
}

export function getInstructionOption(pos, categoryCode, optionCode) {
  const group = getInstructionGroup(pos);
  if (!group) return null;
  const category = group.categories.find((c) => c.category_code === categoryCode);
  if (!category) return null;
  return category.options.find((o) => o.option_code === optionCode)
    || category.options.find((o) => o.is_default)
    || category.options[0]
    || null;
}

function parseOptionLevel(optionCode) {
  const suffix = String(optionCode || '').split(' ')[1];
  return suffix ? Number(suffix) : 2;
}

// Rectangle tactic summary shown above the squad pitch card: one entry per
// instruction category for the position, each with its code and selected level.
export function getTacticSummary(pos, selections) {
  const group = getInstructionGroup(pos);
  if (!group || !selections) return [];
  const defaults = getDefaultInstructions(pos);
  return group.categories.reduce((result, category) => {
    const optionCode = selections[category.category_code];
    if (!optionCode || optionCode === defaults[category.category_code]) return result;
    const option = category.options.find((o) => o.option_code === optionCode) || category.options[0];
    result.push({
      categoryCode: category.category_code,
      level: parseOptionLevel(optionCode),
      colorHex: option?.color_hex,
    });
    return result;
  }, []);
}

export function getDefaultTendency() {
  return { attack: 2, defense: 2 };
}

// Attack/defense tendency badges shown below the pitch card as small house shapes:
// red for Công (attack), blue for Thủ (defense). Level 2 (balanced) is the default
// and renders as no badge — only explicit 1/3 picks show a numbered house.
export function getTendencyBadges(tendency) {
  const t = tendency || getDefaultTendency();
  const attack = Number(t.attack ?? 2);
  const defense = Number(t.defense ?? 2);
  return {
    red: attack === 2 ? null : attack,
    blue: defense === 2 ? null : defense,
  };
}
