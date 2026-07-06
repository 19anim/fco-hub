import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSET_CATEGORIES } from './assetService.js';

test('asset categories include every current runtime family', () => {
  assert.deepEqual(Object.keys(ASSET_CATEGORIES).sort(), [
    'badgeSprite', 'cardTheme', 'general', 'seasonSprite', 'siteAsset',
    'teamColorIcon', 'upgradeBadge', 'upgradeBase', 'upgradeEffect', 'upgradeMascot',
  ]);
});
