import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAssetSourcePath } from './classifier.js';

const EXACT_MAPPINGS = [
  ['/fco/card-themes/card-theme-865.png', 'cardTheme', '865'],
  ['/fco/card-themes/card-theme-ng.svg', 'cardTheme', 'ng'],
  ['/upgrade-badges/grade_0.png', 'upgradeBadge', '0'],
  ['/upgrade-badges/grade_13.png', 'upgradeBadge', '13'],
  ['/upgrade-happy.png', 'upgradeMascot', 'happy'],
  ['/upgrade-sad.png', 'upgradeMascot', 'sad'],
  ['/upgrade.png', 'upgradeBase', 'default'],
  ['/upgrade-effects/shatter_sprite.webp', 'upgradeEffect', 'shatter'],
  ['/fifaaddict-season-sprite.png', 'seasonSprite', 'fifaaddict'],
  ['/fc_online_badges_css_sprite.png', 'badgeSprite', 'fc-online'],
  ['/icons.svg', 'siteAsset', 'icons'],
  ['/favicon.svg', 'siteAsset', 'favicon'],
  ['/fco/teamcolor-icons/strip/club.png', 'teamColorIcon', 'club'],
  ['/fco/teamcolor-icons/strip/grade.png', 'teamColorIcon', 'grade'],
  ['/fco/teamcolor-icons/strip/relation.png', 'teamColorIcon', 'relation'],
];

test('classifies every exact runtime asset mapping', () => {
  for (const [sourcePath, category, key] of EXACT_MAPPINGS) {
    assert.deepEqual(
      pickIdentity(classifyAssetSourcePath(sourcePath)),
      { status: 'classified', category, key },
      sourcePath,
    );
    assert.equal(typeof classifyAssetSourcePath(sourcePath).label, 'string');
    assert.notEqual(classifyAssetSourcePath(sourcePath).label.length, 0);
  }
});

test('normalizes paths and extensions case-insensitively', () => {
  assert.deepEqual(
    pickIdentity(classifyAssetSourcePath('fco\\card-themes\\card-theme-NG.SVG')),
    { status: 'classified', category: 'cardTheme', key: 'ng' },
  );
  assert.deepEqual(
    pickIdentity(classifyAssetSourcePath('/UPGRADE-BADGES/GRADE_13.PNG')),
    { status: 'classified', category: 'upgradeBadge', key: '13' },
  );
});

test('returns unresolved for unknown paths without throwing', () => {
  assert.deepEqual(classifyAssetSourcePath('/demo/card-theme-865.png'), {
    status: 'unresolved',
    reason: 'No classification rule matched',
  });
  assert.deepEqual(classifyAssetSourcePath('/upgrade-badges/grade_14.png'), {
    status: 'unresolved',
    reason: 'No classification rule matched',
  });
});

function pickIdentity(result) {
  return {
    status: result.status,
    category: result.category,
    key: result.key,
  };
}
