import { POSITIONS_META, resolvePositionCode } from './constants.js';
import { normalizeUpgradeLevel } from './upgradeHelpers.js';

function normalizeSquadPlayerLevel(level) {
  const numericLevel = Math.trunc(Number(level));
  return numericLevel === 0 ? 0 : normalizeUpgradeLevel(level);
}

const SQUAD_LS_KEY = 'fco_squad_v1';
export const DEFAULT_FORMATION_ID = '4-2-3-1';

export const FORMATIONS = Object.freeze({
  '3-4-3': {
    id: '3-4-3',
    label: '3-4-3',
    slots: [
      { id: 'lf', pos: 'LF', x: 32, y: 20.9217 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'rf', pos: 'RF', x: 68, y: 20.9217 },
      { id: 'lm', pos: 'LM', x: 15.8, y: 37.3043 },
      { id: 'lcm', pos: 'LCM', x: 39.2, y: 41.4 },
      { id: 'rcm', pos: 'RCM', x: 61.7, y: 41.4 },
      { id: 'rm', pos: 'RM', x: 84.2, y: 37.3043 },
      { id: 'lb', pos: 'LB', x: 27.5, y: 78.2609 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 72.5, y: 78.2609 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '3-4-3-alt': {
    id: '3-4-3-alt',
    label: '3-4-3 (2)',
    slots: [
      { id: 'lw', pos: 'LW', x: 15.8, y: 18.1913 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'rw', pos: 'RW', x: 84.2, y: 18.1913 },
      { id: 'lm', pos: 'LM', x: 5, y: 37.3043 },
      { id: 'lcm', pos: 'LCM', x: 39.2, y: 41.4 },
      { id: 'rcm', pos: 'RCM', x: 61.7, y: 41.4 },
      { id: 'rm', pos: 'RM', x: 95, y: 37.3043 },
      { id: 'lb', pos: 'LB', x: 27.5, y: 78.2609 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 72.5, y: 78.2609 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '3-4-1-2': {
    id: '3-4-1-2',
    label: '3-4-1-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 41, y: 10 },
      { id: 'rs', pos: 'RS', x: 59, y: 10 },
      { id: 'cam', pos: 'CAM', x: 50, y: 29.625 },
      { id: 'lm', pos: 'LM', x: 15.8, y: 42.0826 },
      { id: 'lcm', pos: 'LCM', x: 38.3, y: 44.813 },
      { id: 'rcm', pos: 'RCM', x: 62.6, y: 44.813 },
      { id: 'rm', pos: 'RM', x: 84.2, y: 42.0826 },
      { id: 'lcb', pos: 'LCB', x: 28.4, y: 72.8 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 70.7, y: 72.8 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '3-2-3-2': {
    id: '3-2-3-2',
    label: '3-2-3-2',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'cf', pos: 'CF', x: 50, y: 20.2391 },
      { id: 'lm', pos: 'LM', x: 14, y: 33.8913 },
      { id: 'rm', pos: 'RM', x: 86, y: 33.8913 },
      { id: 'cm', pos: 'CM', x: 50, y: 42.7652 },
      { id: 'ldm', pos: 'LDM', x: 36.5, y: 57.1 },
      { id: 'rdm', pos: 'RDM', x: 63.5, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 27.5, y: 78.2609 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 72.5, y: 78.2609 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '3-2-2-1-2': {
    id: '3-2-2-1-2',
    label: '3-2-2-1-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 41, y: 10 },
      { id: 'rs', pos: 'RS', x: 59, y: 10 },
      { id: 'cam', pos: 'CAM', x: 50, y: 35.2565 },
      { id: 'lm', pos: 'LM', x: 14, y: 50.2739 },
      { id: 'rm', pos: 'RM', x: 86, y: 50.2739 },
      { id: 'ldm', pos: 'LDM', x: 41, y: 57.7826 },
      { id: 'rdm', pos: 'RDM', x: 59, y: 57.7826 },
      { id: 'lb', pos: 'LB', x: 27.5, y: 78.2609 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 72.5, y: 78.2609 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '3-1-2-1-3': {
    id: '3-1-2-1-3',
    label: '3-1-2-1-3',
    slots: [
      { id: 'lw', pos: 'LW', x: 15.8, y: 11.3652 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'rw', pos: 'RW', x: 86, y: 11.3652 },
      { id: 'cam', pos: 'CAM', x: 50, y: 35.2565 },
      { id: 'lm', pos: 'LM', x: 14, y: 45.4957 },
      { id: 'rm', pos: 'RM', x: 86, y: 45.4957 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 27.5, y: 78.2609 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 72.5, y: 78.2609 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '3-1-4-2': {
    id: '3-1-4-2',
    label: '3-1-4-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 36.5, y: 10 },
      { id: 'rs', pos: 'RS', x: 63.5, y: 10 },
      { id: 'lm', pos: 'LM', x: 14, y: 37.3043 },
      { id: 'rm', pos: 'RM', x: 86, y: 37.3043 },
      { id: 'lcm', pos: 'LCM', x: 39.2, y: 43.4478 },
      { id: 'rcm', pos: 'RCM', x: 61.7, y: 43.4478 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 27.5, y: 78.2609 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 72.5, y: 78.2609 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-5-1': {
    id: '4-5-1',
    label: '4-5-1',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'lm', pos: 'LM', x: 15.8, y: 34.5739 },
      { id: 'lcm', pos: 'LCM', x: 33.8, y: 42.0826 },
      { id: 'cm', pos: 'CM', x: 50, y: 47.5435 },
      { id: 'rcm', pos: 'RCM', x: 66.2, y: 42.0826 },
      { id: 'rm', pos: 'RM', x: 84.2, y: 34.5739 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 66.2, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    label: '4-4-2',
    slots: [
      { id: 'cf', pos: 'CF', x: 50, y: 24.3348 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'lm', pos: 'LM', x: 15.8, y: 34.5739 },
      { id: 'lcm', pos: 'LCM', x: 33.8, y: 42.0826 },
      { id: 'rcm', pos: 'RCM', x: 66.2, y: 42.0826 },
      { id: 'rm', pos: 'RM', x: 84.2, y: 34.5739 },
      { id: 'lb', pos: 'LB', x: 11.3, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 66.2, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 88.7, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-4-2-alt': {
    id: '4-4-2-alt',
    label: '4-4-2 (2)',
    slots: [
      { id: 'ls', pos: 'LS', x: 35.6, y: 10 },
      { id: 'rs', pos: 'RS', x: 63.5, y: 10 },
      { id: 'lm', pos: 'LM', x: 16.7, y: 33.8913 },
      { id: 'rm', pos: 'RM', x: 84.2, y: 33.8913 },
      { id: 'lcm', pos: 'LCM', x: 35.6, y: 41.4 },
      { id: 'rcm', pos: 'RCM', x: 62.6, y: 41.4 },
      { id: 'lb', pos: 'LB', x: 14, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 35.6, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 62.6, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-4-1-1': {
    id: '4-4-1-1',
    label: '4-4-1-1',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'cam', pos: 'CAM', x: 50, y: 29.625 },
      { id: 'lm', pos: 'LM', x: 15.8, y: 34.5739 },
      { id: 'rm', pos: 'RM', x: 84.2, y: 34.5739 },
      { id: 'lcm', pos: 'LCM', x: 33.8, y: 42.0826 },
      { id: 'rcm', pos: 'RCM', x: 66.2, y: 42.0826 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 66.2, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-3-3': {
    id: '4-3-3',
    label: '4-3-3',
    slots: [
      { id: 'lw', pos: 'LW', x: 15.8, y: 12.7304 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'rw', pos: 'RW', x: 84.2, y: 12.7304 },
      { id: 'lcm', pos: 'LCM', x: 29.3, y: 46.1783 },
      { id: 'cm', pos: 'CM', x: 50, y: 49.5913 },
      { id: 'rcm', pos: 'RCM', x: 70.7, y: 46.1783 },
      { id: 'lb', pos: 'LB', x: 10.4, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 67.1, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 89.6, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-3-3-alt': {
    id: '4-3-3-alt',
    label: '4-3-3 (2)',
    slots: [
      { id: 'lf', pos: 'LF', x: 32, y: 24.3348 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'rf', pos: 'RF', x: 68, y: 24.3348 },
      { id: 'lcm', pos: 'LCM', x: 35.6, y: 46.1783 },
      { id: 'rcm', pos: 'RCM', x: 64.4, y: 46.1783 },
      { id: 'cm', pos: 'CM', x: 50, y: 48.9087 },
      { id: 'lb', pos: 'LB', x: 14.9, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 67.1, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-3-2-1': {
    id: '4-3-2-1',
    label: '4-3-2-1',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'lam', pos: 'LAM', x: 32, y: 29.7957 },
      { id: 'ram', pos: 'RAM', x: 68, y: 29.7957 },
      { id: 'lm', pos: 'LM', x: 23, y: 43.4478 },
      { id: 'cm', pos: 'CM', x: 50, y: 42.0826 },
      { id: 'rm', pos: 'RM', x: 77, y: 43.4478 },
      { id: 'lb', pos: 'LB', x: 14.9, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 32.9, y: 78.2609 },
      { id: 'rcb', pos: 'RCB', x: 67.1, y: 78.2609 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-3-1-2': {
    id: '4-3-1-2',
    label: '4-3-1-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 39.2, y: 10 },
      { id: 'rs', pos: 'RS', x: 60.8, y: 10 },
      { id: 'cam', pos: 'CAM', x: 50, y: 30.4783 },
      { id: 'lcm', pos: 'LCM', x: 36.5, y: 46.8609 },
      { id: 'cm', pos: 'CM', x: 50, y: 48.9087 },
      { id: 'rcm', pos: 'RCM', x: 63.5, y: 46.8609 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 66.2, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-2-4': {
    id: '4-2-4',
    label: '4-2-4',
    slots: [
      { id: 'lw', pos: 'LW', x: 16.7, y: 25.7 },
      { id: 'ls', pos: 'LS', x: 33.8, y: 10 },
      { id: 'rs', pos: 'RS', x: 66.2, y: 10 },
      { id: 'rw', pos: 'RW', x: 83.3, y: 25.7 },
      { id: 'lcm', pos: 'LCM', x: 33.8, y: 45.4957 },
      { id: 'rcm', pos: 'RCM', x: 66.2, y: 45.4957 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 66.2, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    label: '4-2-3-1',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'lm', pos: 'LM', x: 24.8, y: 33.55 },
      { id: 'cm', pos: 'CM', x: 50, y: 41.4 },
      { id: 'rm', pos: 'RM', x: 75.2, y: 33.55 },
      { id: 'ldm', pos: 'LDM', x: 34.7, y: 61.1957 },
      { id: 'rdm', pos: 'RDM', x: 66.2, y: 61.1957 },
      { id: 'lb', pos: 'LB', x: 8.6, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 34.7, y: 78.2609 },
      { id: 'rcb', pos: 'RCB', x: 66.2, y: 78.2609 },
      { id: 'rb', pos: 'RB', x: 90.5, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-2-2-2': {
    id: '4-2-2-2',
    label: '4-2-2-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 41, y: 10 },
      { id: 'rs', pos: 'RS', x: 59, y: 10 },
      { id: 'lm', pos: 'LM', x: 18.5, y: 35.9391 },
      { id: 'rm', pos: 'RM', x: 81.5, y: 35.9391 },
      { id: 'ldm', pos: 'LDM', x: 39.2, y: 57.1 },
      { id: 'rdm', pos: 'RDM', x: 61.7, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 14.9, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 39.2, y: 78.2609 },
      { id: 'rcb', pos: 'RCB', x: 61.7, y: 78.2609 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-2-2-2-alt': {
    id: '4-2-2-2-alt',
    label: '4-2-2-2 (2)',
    slots: [
      { id: 'ls', pos: 'LS', x: 41, y: 10 },
      { id: 'rs', pos: 'RS', x: 59, y: 10 },
      { id: 'lam', pos: 'LAM', x: 27.5, y: 33.2087 },
      { id: 'ram', pos: 'RAM', x: 72.5, y: 31.1609 },
      { id: 'ldm', pos: 'LDM', x: 39.2, y: 57.1 },
      { id: 'rdm', pos: 'RDM', x: 61.7, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 14.9, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 39.2, y: 78.2609 },
      { id: 'rcb', pos: 'RCB', x: 61.7, y: 78.2609 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-2-2-1-1': {
    id: '4-2-2-1-1',
    label: '4-2-2-1-1',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'cam', pos: 'CAM', x: 50, y: 29.7957 },
      { id: 'lm', pos: 'LM', x: 16.7, y: 34.5739 },
      { id: 'rm', pos: 'RM', x: 84.2, y: 34.5739 },
      { id: 'ldm', pos: 'LDM', x: 33.8, y: 57.1 },
      { id: 'rdm', pos: 'RDM', x: 65.3, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 66.2, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-2-1-3': {
    id: '4-2-1-3',
    label: '4-2-1-3',
    slots: [
      { id: 'lw', pos: 'LW', x: 15.8, y: 12.7304 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'rw', pos: 'RW', x: 84.2, y: 12.7304 },
      { id: 'cam', pos: 'CAM', x: 50, y: 37.3043 },
      { id: 'lcm', pos: 'LCM', x: 33.8, y: 46.1783 },
      { id: 'rcm', pos: 'RCM', x: 67.1, y: 46.1783 },
      { id: 'lb', pos: 'LB', x: 12.2, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 67.1, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 87.8, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-2-1-3-alt': {
    id: '4-2-1-3-alt',
    label: '4-2-1-3 (2)',
    slots: [
      { id: 'lw', pos: 'LW', x: 15.8, y: 12.7304 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'rw', pos: 'RW', x: 84.2, y: 12.7304 },
      { id: 'cm', pos: 'CM', x: 50, y: 41.4 },
      { id: 'ldm', pos: 'LDM', x: 33.8, y: 57.1 },
      { id: 'rdm', pos: 'RDM', x: 67.1, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 14.9, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 67.1, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-1-4-1': {
    id: '4-1-4-1',
    label: '4-1-4-1',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 14.0957 },
      { id: 'lm', pos: 'LM', x: 13.1, y: 35.2565 },
      { id: 'lcm', pos: 'LCM', x: 37.4, y: 42.0826 },
      { id: 'rcm', pos: 'RCM', x: 62.6, y: 42.0826 },
      { id: 'rm', pos: 'RM', x: 86.9, y: 35.2565 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 37.4, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 61.7, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-1-3-2': {
    id: '4-1-3-2',
    label: '4-1-3-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 42.8, y: 10 },
      { id: 'rs', pos: 'RS', x: 57.2, y: 10 },
      { id: 'cm', pos: 'CM', x: 50, y: 41.4 },
      { id: 'lm', pos: 'LM', x: 15.8, y: 33.55 },
      { id: 'rm', pos: 'RM', x: 84.2, y: 33.55 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.7826 },
      { id: 'lb', pos: 'LB', x: 14.9, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 67.1, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-1-2-3': {
    id: '4-1-2-3',
    label: '4-1-2-3',
    slots: [
      { id: 'lw', pos: 'LW', x: 15.8, y: 12.7304 },
      { id: 'st', pos: 'ST', x: 50, y: 15.4609 },
      { id: 'rw', pos: 'RW', x: 84.2, y: 12.7304 },
      { id: 'lcm', pos: 'LCM', x: 33.8, y: 46.1783 },
      { id: 'rcm', pos: 'RCM', x: 67.1, y: 46.1783 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 14.9, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 67.1, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-1-2-3-alt': {
    id: '4-1-2-3-alt',
    label: '4-1-2-3 (2)',
    slots: [
      { id: 'lw', pos: 'LW', x: 14, y: 16.8261 },
      { id: 'cf', pos: 'CF', x: 50, y: 19.5565 },
      { id: 'rw', pos: 'RW', x: 86, y: 16.8261 },
      { id: 'lcm', pos: 'LCM', x: 33.8, y: 44.1304 },
      { id: 'rcm', pos: 'RCM', x: 67.1, y: 44.1304 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.7826 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 67.1, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-1-2-1-2': {
    id: '4-1-2-1-2',
    label: '4-1-2-1-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 36.5, y: 10 },
      { id: 'rs', pos: 'RS', x: 63.5, y: 10 },
      { id: 'cam', pos: 'CAM', x: 50, y: 33.8913 },
      { id: 'lm', pos: 'LM', x: 13.1, y: 37.3043 },
      { id: 'rm', pos: 'RM', x: 86.9, y: 37.3043 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 37.4, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 62.6, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '4-1-2-1-2-alt': {
    id: '4-1-2-1-2-alt',
    label: '4-1-2-1-2 (2)',
    slots: [
      { id: 'ls', pos: 'LS', x: 36.5, y: 10 },
      { id: 'rs', pos: 'RS', x: 63.5, y: 10 },
      { id: 'cam', pos: 'CAM', x: 50, y: 31.8435 },
      { id: 'lcm', pos: 'LCM', x: 36.5, y: 41.4 },
      { id: 'rcm', pos: 'RCM', x: 63.5, y: 41.4 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.1 },
      { id: 'lb', pos: 'LB', x: 13.1, y: 70.8375 },
      { id: 'lcb', pos: 'LCB', x: 37.4, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 62.6, y: 72.8 },
      { id: 'rb', pos: 'RB', x: 86.9, y: 70.8375 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '5-4-1': {
    id: '5-4-1',
    label: '5-4-1',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'lm', pos: 'LM', x: 18.5, y: 33.8913 },
      { id: 'lcm', pos: 'LCM', x: 32, y: 44.1304 },
      { id: 'rcm', pos: 'RCM', x: 68, y: 44.1304 },
      { id: 'rm', pos: 'RM', x: 81.5, y: 33.8913 },
      { id: 'lwb', pos: 'LWB', x: 15.8, y: 58.4652 },
      { id: 'lcb', pos: 'LCB', x: 30.2, y: 72.8 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 69.8, y: 72.8 },
      { id: 'rwb', pos: 'RWB', x: 84.2, y: 58.4652 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '5-3-2': {
    id: '5-3-2',
    label: '5-3-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 38.3, y: 16.8261 },
      { id: 'rs', pos: 'RS', x: 61.7, y: 16.8261 },
      { id: 'lcm', pos: 'LCM', x: 31.1, y: 44.1304 },
      { id: 'cm', pos: 'CM', x: 50, y: 44.1304 },
      { id: 'rcm', pos: 'RCM', x: 68.9, y: 44.1304 },
      { id: 'lwb', pos: 'LWB', x: 15.8, y: 58.4652 },
      { id: 'lcb', pos: 'LCB', x: 30.2, y: 73.4826 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 69.8, y: 73.4826 },
      { id: 'rwb', pos: 'RWB', x: 84.2, y: 58.4652 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '5-2-3': {
    id: '5-2-3',
    label: '5-2-3',
    slots: [
      { id: 'lw', pos: 'LW', x: 15.8, y: 12.7304 },
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'rw', pos: 'RW', x: 84.2, y: 12.7304 },
      { id: 'lcm', pos: 'LCM', x: 36.5, y: 44.1304 },
      { id: 'rcm', pos: 'RCM', x: 63.5, y: 44.1304 },
      { id: 'lwb', pos: 'LWB', x: 15.8, y: 58.4652 },
      { id: 'lcb', pos: 'LCB', x: 30.2, y: 72.8 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 69.8, y: 72.8 },
      { id: 'rwb', pos: 'RWB', x: 84.2, y: 58.4652 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '5-2-1-2': {
    id: '5-2-1-2',
    label: '5-2-1-2',
    slots: [
      { id: 'ls', pos: 'LS', x: 38.3, y: 16.8261 },
      { id: 'rs', pos: 'RS', x: 61.7, y: 16.8261 },
      { id: 'cam', pos: 'CAM', x: 50, y: 32.5261 },
      { id: 'lcm', pos: 'LCM', x: 37.4, y: 44.1304 },
      { id: 'rcm', pos: 'RCM', x: 62.6, y: 44.1304 },
      { id: 'lwb', pos: 'LWB', x: 15.8, y: 58.4652 },
      { id: 'lcb', pos: 'LCB', x: 30.2, y: 72.8 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 69.8, y: 72.8 },
      { id: 'rwb', pos: 'RWB', x: 84.2, y: 58.4652 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
  '5-1-2-1-1': {
    id: '5-1-2-1-1',
    label: '5-1-2-1-1',
    slots: [
      { id: 'st', pos: 'ST', x: 50, y: 10 },
      { id: 'cam', pos: 'CAM', x: 50, y: 29.625 },
      { id: 'lm', pos: 'LM', x: 14, y: 33.8913 },
      { id: 'rm', pos: 'RM', x: 86, y: 33.8913 },
      { id: 'cdm', pos: 'CDM', x: 50, y: 57.1 },
      { id: 'lwb', pos: 'LWB', x: 14, y: 65.9739 },
      { id: 'lcb', pos: 'LCB', x: 33.8, y: 72.8 },
      { id: 'cb', pos: 'CB', x: 50, y: 72.8 },
      { id: 'rcb', pos: 'RCB', x: 66.2, y: 72.8 },
      { id: 'rwb', pos: 'RWB', x: 86, y: 65.9739 },
      { id: 'gk', pos: 'GK', x: 50, y: 88.5 },
    ],
  },
});

export const FORMATION_OPTIONS = Object.freeze(Object.values(FORMATIONS).map(({ id, label }) => ({ id, label })));
export const FORMATION_SLOTS = FORMATIONS['4-3-3'].slots;

function getFormation(id) {
  return FORMATIONS[id] || FORMATIONS[DEFAULT_FORMATION_ID];
}

function isPersistedV2(raw) {
  return raw && typeof raw === 'object' && raw.bySlotId && typeof raw.bySlotId === 'object';
}

export function normalizeSquadSlots(slots) {
  if (!Array.isArray(slots) || slots.length !== 11) return null;
  const seen = new Set();
  const normalized = [];
  for (const slot of slots) {
    const id = String(slot?.id || '').trim();
    const pos = String(slot?.pos || '').trim().toUpperCase();
    const x = Number(slot?.x);
    const y = Number(slot?.y);
    if (!id || seen.has(id) || !POSITIONS_META[pos] || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    seen.add(id);
    normalized.push({ id, pos, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }
  return normalized;
}

export function loadSquad() {
  try {
    const raw = JSON.parse(localStorage.getItem(SQUAD_LS_KEY) || '{}');
    if (!raw || typeof raw !== 'object') return { formationId: DEFAULT_FORMATION_ID, bySlotId: {}, customSlots: null };
    if (isPersistedV2(raw)) {
      return {
        formationId: FORMATIONS[raw.formationId] ? raw.formationId : DEFAULT_FORMATION_ID,
        bySlotId: raw.bySlotId || {},
        customSlots: normalizeSquadSlots(raw.customSlots),
      };
    }
    return { formationId: '4-3-3', bySlotId: raw, customSlots: null };
  } catch {
    return { formationId: DEFAULT_FORMATION_ID, bySlotId: {}, customSlots: null };
  }
}

export function saveSquad(squad) {
  try {
    const customSlots = normalizeSquadSlots(squad?.customSlots);
    localStorage.setItem(SQUAD_LS_KEY, JSON.stringify({
      formationId: FORMATIONS[squad?.formationId] ? squad.formationId : DEFAULT_FORMATION_ID,
      bySlotId: squad?.bySlotId || {},
      customSlots,
    }));
  } catch {}
}

export function getFormationSlots(formationId) {
  return getFormation(formationId).slots;
}

export function getActiveSquadSlots(squad) {
  return normalizeSquadSlots(squad?.customSlots) || getFormationSlots(squad?.formationId || DEFAULT_FORMATION_ID);
}

export function getStartersFromSquad(bySlotId, slots = getFormationSlots(DEFAULT_FORMATION_ID)) {
  return slots.map((slot) => bySlotId?.[slot.id] || null).filter(Boolean);
}

export function assignPlayerToSlot(bySlotId, slotId, player) {
  return { ...(bySlotId || {}), [slotId]: player };
}

export function clearSlot(bySlotId, slotId) {
  const next = { ...(bySlotId || {}) };
  delete next[slotId];
  return next;
}

export function swapSquadSlots(bySlotId, fromSlotId, toSlotId) {
  if (!fromSlotId || !toSlotId || fromSlotId === toSlotId) return bySlotId || {};
  const next = { ...(bySlotId || {}) };
  const fromPlayer = next[fromSlotId];
  const toPlayer = next[toSlotId];
  if (toPlayer) next[fromSlotId] = toPlayer;
  else delete next[fromSlotId];
  if (fromPlayer) next[toSlotId] = fromPlayer;
  else delete next[toSlotId];
  return next;
}

export function movePlayerToSlot(bySlotId, fromSlotId, toSlotId) {
  if (!fromSlotId || !toSlotId || fromSlotId === toSlotId) return bySlotId || {};
  const next = { ...(bySlotId || {}) };
  const fromPlayer = next[fromSlotId];
  if (!fromPlayer) return bySlotId || {};
  delete next[fromSlotId];
  next[toSlotId] = fromPlayer;
  return next;
}

export function updateSquadPlayerLevel(bySlotId, slotId, level) {
  const player = bySlotId?.[slotId];
  if (!player) return bySlotId || {};
  return {
    ...(bySlotId || {}),
    [slotId]: { ...player, upgradeLevel: normalizeSquadPlayerLevel(level) },
  };
}

function slotScore(player, slot) {
  if (!player || !slot) return -1;
  const positions = [player.primaryPos, ...(player.positions || [])].filter(Boolean).map(resolvePositionCode);
  const slotPos = resolvePositionCode(slot.pos);
  const slotGroup = POSITIONS_META[slotPos]?.group;
  if (positions.includes(slotPos)) return 3;
  if (positions.some((pos) => POSITIONS_META[resolvePositionCode(pos)]?.group === slotGroup)) return 2;
  return 1;
}

export function mapSquadToFormation(oldBySlotId, oldSlots, nextSlots) {
  const players = (oldSlots || []).map((slot) => oldBySlotId?.[slot.id]).filter(Boolean);
  const next = {};
  const remaining = [...players];

  nextSlots.forEach((slot) => {
    let bestIndex = -1;
    let bestScore = -1;
    remaining.forEach((player, index) => {
      const score = slotScore(player, slot);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) {
      next[slot.id] = remaining[bestIndex];
      remaining.splice(bestIndex, 1);
    }
  });

  return next;
}

const GROUP_POSITIONS = Object.freeze({
  GK:  ['GK'],
  DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  FWD: ['ST', 'CF', 'LW', 'RW'],
});

export function getPickerPosGroupsForSlot(pos) {
  const resolvedPos = resolvePositionCode(pos);
  const group = POSITIONS_META[resolvedPos]?.group;
  return group ? GROUP_POSITIONS[group] || [resolvedPos] : [];
}
