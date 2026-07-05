import { useState, useEffect } from 'react';
import { fetchPlayerDetail } from '../api.js';
import MonetizationSlot from '../../components/monetization/MonetizationSlot';
import { formatCoins, statColor, cleanName, getSeason, getTrust } from '../helpers.js';
import { PlayerAvatar, SeasonChip, TrustBadge, Button, Stars, EmptyState } from '../ui.jsx';
import * as I from '../Icons.jsx';
import { applyDetailBonuses, getDetailBonusModel } from './detailBonus.js';
import { calculateTrainingOvr, getTrainingStats } from './trainingOvrConfig.js';

const STAT_GROUPS = [
  { key: 'pace',      label: 'Tốc độ',     en: 'Pace' },
  { key: 'shooting',  label: 'Dứt điểm',   en: 'Shooting' },
  { key: 'passing',   label: 'Chuyền bóng', en: 'Passing' },
  { key: 'dribbling', label: 'Kỹ thuật',   en: 'Dribbling' },
  { key: 'defending', label: 'Phòng thủ',  en: 'Defending' },
  { key: 'physical',  label: 'Thể lực',    en: 'Physical' },
];

const GK_STAT_GROUPS = [
  { key: 'diving',      label: 'Đổ người',    en: 'Diving' },
  { key: 'handling',    label: 'Bắt bóng',    en: 'Handling' },
  { key: 'kicking',     label: 'Phát bóng',   en: 'Kicking' },
  { key: 'reflexes',    label: 'Phản xạ',     en: 'Reflexes' },
  { key: 'speed',       label: 'Tốc độ',      en: 'Speed' },
  { key: 'positioning', label: 'Chọn vị trí', en: 'Positioning' },
];

const GK_GROUP = { key: 'gk', label: 'Thủ môn', en: 'Goalkeeper' };
const FLAT_SUB_STAT_ORDER = [
  { group: 'physical', label: 'Sức mạnh' },
  { group: 'pace', label: 'Tăng tốc' },
  { group: 'pace', label: 'Tốc độ' },
  { group: 'dribbling', label: 'Rê bóng' },
  { group: 'dribbling', label: 'Giữ bóng' },
  { group: 'passing', label: 'Ch.ngắn' },
  { group: 'shooting', label: 'Dứt điểm' },
  { group: 'shooting', label: 'Lực sút' },
  { group: 'physical', label: 'Đánh đầu' },
  { group: 'shooting', label: 'Sút xa' },
  { group: 'shooting', label: 'Vô-lê' },
  { group: 'shooting', label: 'Chọn vị trí' },
  { group: 'dribbling', label: 'Phản ứng' },
  { group: 'shooting', label: 'Penalty' },
  { group: 'passing', label: 'Tầm nhìn' },
  { group: 'passing', label: 'Tạt bóng' },
  { group: 'passing', label: 'Ch.dài' },
  { group: 'passing', label: 'Đá phạt' },
  { group: 'passing', label: 'Sút xoáy' },
  { group: 'dribbling', label: 'Khéo léo' },
  { group: 'dribbling', label: 'Thăng bằng' },
  { group: 'defending', label: 'Kèm người' },
  { group: 'defending', label: 'Lắy bóng' },
  { group: 'defending', label: 'Cắt bóng' },
  { group: 'defending', label: 'Xoạc bóng' },
  { group: 'physical', label: 'Thể lực' },
  { group: 'physical', label: 'Quyết đoán' },
  { group: 'physical', label: 'Nhảy' },
  { group: 'dribbling', label: 'Binh tĩnh' },
];
const DEFAULT_SUB_STAT_ORDER = [
  'Sức mạnh', 'Tăng tốc', 'Tốc độ', 'Rê bóng', 'Giữ bóng', 'Ch.ngắn', 'Dứt điểm', 'Lực sút', 'Đánh đầu', 'Sút xa',
  'Vô-lê', 'Chọn vị trí', 'Phản ứng', 'Penalty', 'Tầm nhìn', 'Tạt bóng', 'Ch.dài', 'Đá phạt', 'Sút xoáy', 'Khéo léo',
  'Thăng bằng', 'Kèm người', 'Lắy bóng', 'Cắt bóng', 'Xoạc bóng', 'Thể lực', 'Quyết đoán', 'Nhảy', 'Binh tĩnh',
  'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
];
const POSITION_SUB_STAT_ORDER = {
  OVR: [
    'Tốc độ', 'Tăng tốc', 'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí', 'Vô-lê', 'Penalty', 'Ch.ngắn', 'Tầm nhìn',
    'Tạt bóng', 'Ch.dài', 'Đá phạt', 'Sút xoáy', 'Rê bóng', 'Giữ bóng', 'Khéo léo', 'Thăng bằng', 'Phản ứng',
    'Kèm người', 'Lắy bóng', 'Cắt bóng', 'Đánh đầu', 'Xoạc bóng', 'Sức mạnh', 'Thể lực', 'Quyết đoán', 'Nhảy',
    'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  ST: DEFAULT_SUB_STAT_ORDER,
  RW: [
    'Tăng tốc', 'Tốc độ', 'Khéo léo', 'Rê bóng', 'Giữ bóng', 'Tạt bóng', 'Ch.ngắn', 'Dứt điểm', 'Sút xa',
    'Chọn vị trí', 'Tầm nhìn', 'Phản ứng', 'Lực sút', 'Vô-lê', 'Penalty', 'Ch.dài', 'Đá phạt', 'Sút xoáy',
    'Thăng bằng', 'Kèm người', 'Lắy bóng', 'Cắt bóng', 'Đánh đầu', 'Xoạc bóng', 'Sức mạnh', 'Thể lực', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  LW: [
    'Tăng tốc', 'Tốc độ', 'Khéo léo', 'Rê bóng', 'Giữ bóng', 'Tạt bóng', 'Ch.ngắn', 'Dứt điểm', 'Sút xa',
    'Chọn vị trí', 'Tầm nhìn', 'Phản ứng', 'Lực sút', 'Vô-lê', 'Penalty', 'Ch.dài', 'Đá phạt', 'Sút xoáy',
    'Thăng bằng', 'Kèm người', 'Lắy bóng', 'Cắt bóng', 'Đánh đầu', 'Xoạc bóng', 'Sức mạnh', 'Thể lực', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  CF: [
    'Tăng tốc', 'Tốc độ', 'Rê bóng', 'Giữ bóng', 'Ch.ngắn', 'Dứt điểm', 'Lực sút', 'Đánh đầu', 'Sút xa',
    'Chọn vị trí', 'Tầm nhìn', 'Phản ứng', 'Vô-lê', 'Penalty', 'Tạt bóng', 'Ch.dài', 'Đá phạt', 'Sút xoáy',
    'Khéo léo', 'Thăng bằng', 'Kèm người', 'Lắy bóng', 'Cắt bóng', 'Xoạc bóng', 'Sức mạnh', 'Thể lực', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  CAM: [
    'Tăng tốc', 'Tốc độ', 'Khéo léo', 'Rê bóng', 'Giữ bóng', 'Ch.ngắn', 'Dứt điểm', 'Ch.dài', 'Sút xa',
    'Chọn vị trí', 'Tầm nhìn', 'Phản ứng', 'Lực sút', 'Vô-lê', 'Penalty', 'Tạt bóng', 'Đá phạt', 'Sút xoáy',
    'Thăng bằng', 'Kèm người', 'Lắy bóng', 'Cắt bóng', 'Đánh đầu', 'Xoạc bóng', 'Sức mạnh', 'Thể lực', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  RM: [
    'Thể lực', 'Tăng tốc', 'Tốc độ', 'Rê bóng', 'Giữ bóng', 'Tạt bóng', 'Ch.ngắn', 'Dứt điểm', 'Ch.dài',
    'Chọn vị trí', 'Tầm nhìn', 'Phản ứng', 'Lực sút', 'Sút xa', 'Vô-lê', 'Penalty', 'Đá phạt', 'Sút xoáy',
    'Khéo léo', 'Thăng bằng', 'Kèm người', 'Lắy bóng', 'Cắt bóng', 'Đánh đầu', 'Xoạc bóng', 'Sức mạnh', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  LM: [
    'Thể lực', 'Tăng tốc', 'Tốc độ', 'Rê bóng', 'Giữ bóng', 'Tạt bóng', 'Ch.ngắn', 'Dứt điểm', 'Ch.dài',
    'Chọn vị trí', 'Tầm nhìn', 'Phản ứng', 'Lực sút', 'Sút xa', 'Vô-lê', 'Penalty', 'Đá phạt', 'Sút xoáy',
    'Khéo léo', 'Thăng bằng', 'Kèm người', 'Lắy bóng', 'Cắt bóng', 'Đánh đầu', 'Xoạc bóng', 'Sức mạnh', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  CM: [
    'Thể lực', 'Rê bóng', 'Giữ bóng', 'Lắy bóng', 'Ch.ngắn', 'Dứt điểm', 'Ch.dài', 'Sút xa', 'Cắt bóng',
    'Chọn vị trí', 'Tầm nhìn', 'Phản ứng', 'Tốc độ', 'Tăng tốc', 'Lực sút', 'Vô-lê', 'Penalty', 'Tạt bóng',
    'Đá phạt', 'Sút xoáy', 'Khéo léo', 'Thăng bằng', 'Kèm người', 'Đánh đầu', 'Xoạc bóng', 'Sức mạnh', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  CDM: [
    'Sức mạnh', 'Thể lực', 'Xoạc bóng', 'Giữ bóng', 'Kèm người', 'Lắy bóng', 'Ch.ngắn', 'Ch.dài', 'Cắt bóng',
    'Tầm nhìn', 'Phản ứng', 'Quyết đoán', 'Tốc độ', 'Tăng tốc', 'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí',
    'Vô-lê', 'Penalty', 'Tạt bóng', 'Đá phạt', 'Sút xoáy', 'Rê bóng', 'Khéo léo', 'Thăng bằng', 'Đánh đầu', 'Nhảy',
    'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  RWB: [
    'Thể lực', 'Tăng tốc', 'Tốc độ', 'Xoạc bóng', 'Rê bóng', 'Giữ bóng', 'Kèm người', 'Lắy bóng', 'Tạt bóng',
    'Ch.ngắn', 'Cắt bóng', 'Phản ứng', 'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí', 'Vô-lê', 'Penalty',
    'Tầm nhìn', 'Ch.dài', 'Đá phạt', 'Sút xoáy', 'Khéo léo', 'Thăng bằng', 'Đánh đầu', 'Sức mạnh', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  LWB: [
    'Thể lực', 'Tăng tốc', 'Tốc độ', 'Xoạc bóng', 'Rê bóng', 'Giữ bóng', 'Kèm người', 'Lắy bóng', 'Tạt bóng',
    'Ch.ngắn', 'Cắt bóng', 'Phản ứng', 'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí', 'Vô-lê', 'Penalty',
    'Tầm nhìn', 'Ch.dài', 'Đá phạt', 'Sút xoáy', 'Khéo léo', 'Thăng bằng', 'Đánh đầu', 'Sức mạnh', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  RB: [
    'Thể lực', 'Tăng tốc', 'Tốc độ', 'Xoạc bóng', 'Giữ bóng', 'Kèm người', 'Lắy bóng', 'Tạt bóng', 'Ch.ngắn',
    'Đánh đầu', 'Cắt bóng', 'Phản ứng', 'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí', 'Vô-lê', 'Penalty',
    'Tầm nhìn', 'Ch.dài', 'Đá phạt', 'Sút xoáy', 'Rê bóng', 'Khéo léo', 'Thăng bằng', 'Sức mạnh', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  LB: [
    'Thể lực', 'Tăng tốc', 'Tốc độ', 'Xoạc bóng', 'Giữ bóng', 'Kèm người', 'Lắy bóng', 'Tạt bóng', 'Ch.ngắn',
    'Đánh đầu', 'Cắt bóng', 'Phản ứng', 'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí', 'Vô-lê', 'Penalty',
    'Tầm nhìn', 'Ch.dài', 'Đá phạt', 'Sút xoáy', 'Rê bóng', 'Khéo léo', 'Thăng bằng', 'Sức mạnh', 'Quyết đoán',
    'Nhảy', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  CB: [
    'Sức mạnh', 'Tốc độ', 'Nhảy', 'Xoạc bóng', 'Giữ bóng', 'Kèm người', 'Lắy bóng', 'Ch.ngắn', 'Đánh đầu',
    'Cắt bóng', 'Phản ứng', 'Quyết đoán', 'Tăng tốc', 'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí', 'Vô-lê',
    'Penalty', 'Tầm nhìn', 'Tạt bóng', 'Ch.dài', 'Đá phạt', 'Sút xoáy', 'Rê bóng', 'Khéo léo', 'Thăng bằng',
    'Thể lực', 'Binh tĩnh', 'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Phản xạ', 'gk:Chọn vị trí',
  ],
  GK: [
    'gk:Đổ người', 'gk:Bắt bóng', 'gk:Phát bóng', 'gk:Chọn vị trí', 'gk:Phản xạ', 'Phản ứng', 'Tốc độ', 'Tăng tốc',
    'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí', 'Vô-lê', 'Penalty', 'Ch.ngắn', 'Tầm nhìn', 'Tạt bóng', 'Ch.dài',
    'Đá phạt', 'Sút xoáy', 'Rê bóng', 'Giữ bóng', 'Khéo léo', 'Thăng bằng', 'Kèm người', 'Lắy bóng', 'Cắt bóng',
    'Đánh đầu', 'Xoạc bóng', 'Sức mạnh', 'Thể lực', 'Quyết đoán', 'Nhảy', 'Binh tĩnh',
  ],
};
const DEFAULT_STAT_ORDER = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'gk'];
const POSITION_STAT_ORDER = {
  ST: ['shooting', 'pace', 'dribbling', 'physical', 'passing', 'defending', 'gk'],
  CF: ['shooting', 'dribbling', 'passing', 'pace', 'physical', 'defending', 'gk'],
  LW: ['pace', 'dribbling', 'shooting', 'passing', 'physical', 'defending', 'gk'],
  RW: ['pace', 'dribbling', 'shooting', 'passing', 'physical', 'defending', 'gk'],
  LM: ['pace', 'passing', 'dribbling', 'shooting', 'physical', 'defending', 'gk'],
  RM: ['pace', 'passing', 'dribbling', 'shooting', 'physical', 'defending', 'gk'],
  CAM: ['passing', 'dribbling', 'shooting', 'pace', 'physical', 'defending', 'gk'],
  CM: ['passing', 'dribbling', 'physical', 'defending', 'shooting', 'pace', 'gk'],
  CDM: ['defending', 'physical', 'passing', 'pace', 'dribbling', 'shooting', 'gk'],
  LWB: ['pace', 'defending', 'physical', 'passing', 'dribbling', 'shooting', 'gk'],
  RWB: ['pace', 'defending', 'physical', 'passing', 'dribbling', 'shooting', 'gk'],
  LB: ['defending', 'pace', 'physical', 'passing', 'dribbling', 'shooting', 'gk'],
  RB: ['defending', 'pace', 'physical', 'passing', 'dribbling', 'shooting', 'gk'],
  CB: ['defending', 'physical', 'pace', 'passing', 'dribbling', 'shooting', 'gk'],
  GK: ['gk', 'pace', 'passing', 'physical', 'defending', 'dribbling', 'shooting'],
};

const GRADE_OPTIONS = Array.from({ length: 13 }, (_, index) => index + 1);
const LEVEL_OPTIONS = Array.from({ length: 5 }, (_, index) => index + 1);
const BONUS_OPTIONS = Array.from({ length: 11 }, (_, index) => index);
const OVR_POSITION = 'OVR';
const GK_POSITION = 'GK';
const FW_POSITIONS = new Set(['ST', 'CF', 'LW', 'RW', 'LF', 'RF']);
const MF_POSITIONS = new Set(['CAM', 'CM', 'CDM', 'LM', 'RM']);
const DF_POSITIONS = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']);

function expandPositionLabel(label) {
  if (!label || label === OVR_POSITION) return [];
  if (label.startsWith('L/R')) return [`L${label.slice(3)}`, `R${label.slice(3)}`];
  return [label];
}

function getStatOrderForPosition(label) {
  const positions = expandPositionLabel(label);
  return POSITION_STAT_ORDER[positions[0]] || DEFAULT_STAT_ORDER;
}

function getSubStatOrderForPosition(label) {
  const positions = label === OVR_POSITION ? [OVR_POSITION] : expandPositionLabel(label);
  return POSITION_SUB_STAT_ORDER[positions[0]] || DEFAULT_SUB_STAT_ORDER;
}

function getSubStatOrderKey(stat) {
  return stat.group === 'gk' ? `gk:${stat.label}` : stat.label;
}

function getPositionTone(label) {
  const positions = expandPositionLabel(label);
  if (positions.some((pos) => pos === GK_POSITION)) return 'gk';
  if (positions.some((pos) => FW_POSITIONS.has(pos))) return 'fw';
  if (positions.some((pos) => MF_POSITIONS.has(pos))) return 'mf';
  if (positions.some((pos) => DF_POSITIONS.has(pos))) return 'df';
  return 'muted';
}

function Panel({ title, sub, subTone, children, className }) {
  return (
    <div className={`fco-panel${className ? ' ' + className : ''}`}>
      <div className="fco-panel-head">
        <div className="fco-panel-title">
          {title}
          {sub && <span className={`fco-panel-title-sub${subTone ? ` ${subTone}` : ''}`}>{sub}</span>}
        </div>
      </div>
      <div className="fco-panel-body">{children}</div>
    </div>
  );
}

function TabbedPanel({ tabs, className }) {
  const visible = tabs.filter(t => t.show);
  const [active, setActive] = useState(() => visible[0]?.key);
  const tab = visible.find(t => t.key === active) ?? visible[0];
  if (!visible.length) return null;
  return (
    <div className={`fco-panel${className ? ' ' + className : ''}`}>
      <div className="fco-panel-head">
        <div className="fco-panel-tabs">
          {visible.map(t => (
            <button
              key={t.key}
              type="button"
              className={`fco-panel-tab${tab?.key === t.key ? ' on' : ''}`}
              onClick={() => setActive(t.key)}
            >
              {t.label}
              {t.count != null && <span className="fco-panel-tab-count">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="fco-panel-body">{tab?.content}</div>
    </div>
  );
}

function TrainingOvrTab({ p, position }) {
  const stats = getTrainingStats(position);
  const [training, setTraining] = useState(() => ({}));

  useEffect(() => {
    setTraining({});
  }, [position]);

  const trainedCount = Object.values(training).filter(v => v > 0).length;

  if (!stats) {
    return (
      <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '12px 0' }}>
        Chưa hỗ trợ vị trí này.
      </div>
    );
  }

  function setPoint(name, delta) {
    setTraining(prev => {
      const cur = prev[name] || 0;
      const next = Math.max(0, Math.min(2, cur + delta));
      if (next === cur) return prev;
      return { ...prev, [name]: next };
    });
  }

  function reset() {
    setTraining({});
  }

  const byKey = new Map();
  FLAT_SUB_STAT_ORDER.forEach(({ group, label }) => {
    const stat = (p.detailed?.[group] || []).find(item => item.label === label);
    if (stat?.value != null) byKey.set(label, stat.value);
  });
  GK_STAT_GROUPS.forEach(group => {
    const value = p.detailed?.gk?.[group.key] ?? null;
    if (value != null) byKey.set(`gk:${group.label}`, value);
  });

  const statValues = Object.fromEntries(stats.map((stat) => [stat.name, byKey.get(stat.statKey) ?? 0]));
  const trainingOvr = calculateTrainingOvr({ position, statValues, training });
  const ovrBefore = trainingOvr.before;
  const ovrAfter = trainingOvr.after;
  const gained = trainingOvr.gained;
  const selectedTraining = stats
    .map((stat) => ({ ...stat, points: training[stat.name] || 0 }))
    .filter((stat) => stat.points > 0);
  const trainingSlots = Array.from({ length: 5 }, (_, index) => selectedTraining[index] || null);

  return (
    <div className="fco-training-tab">
      <div className="fco-training-dashboard">
        <div className="fco-training-dashboard-main">
          <div>
            <div className="fco-training-kicker">Đào tạo OVR · {position}</div>
            <div className="fco-training-helper">Tối đa 5 chỉ số, mỗi chỉ số +2 điểm</div>
          </div>
          <div className="fco-training-ovr-lockup">
            <span className="fco-training-ovr-value" style={{ color: statColor(ovrBefore) }}>{ovrBefore}</span>
            <span className="fco-training-ovr-arrow">→</span>
            <span className="fco-training-ovr-value after" style={{ color: gained > 0 ? 'var(--accent)' : statColor(ovrAfter) }}>
              {ovrAfter.toFixed(2)}
            </span>
          </div>
          <div className="fco-training-dashboard-actions">
            <span className={`fco-training-gain${gained > 0 ? ' on' : ''}`}>{gained > 0 ? `+${gained.toFixed(2)}` : '+0.00'} OVR</span>
            <span className="fco-training-count">{trainedCount}/5 chỉ số</span>
            <button type="button" className="fco-training-reset" onClick={reset} disabled={trainedCount === 0}>
              Đặt lại
            </button>
          </div>
        </div>
        <div className="fco-training-slots" aria-label="Chỉ số đang đào tạo">
          {trainingSlots.map((slot, index) => (
            <div key={slot?.name || `slot-${index}`} className={`fco-training-slot${slot ? ' filled' : ''}`}>
              <span>{slot ? slot.name : `Slot ${index + 1}`}</span>
              <strong>{slot ? `+${slot.points}` : '—'}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="fco-training-list">
        <div className="fco-training-list-head">
          <span>Chỉ số</span>
          <span>Hệ số</span>
          <span>Hiện tại</span>
          <span>Điểm rèn</span>
        </div>
        {stats.map((s) => {
          const base = byKey.get(s.statKey) ?? 0;
          const pts = training[s.name] || 0;
          const canAdd = pts < 2 && (pts > 0 || trainedCount < 5);
          const canSub = pts > 0;
          return (
            <div key={s.name} className={`fco-training-row${pts > 0 ? ' on' : ''}`}>
              <div className="fco-training-stat-name">
                <strong>{s.name}</strong>
              </div>
              <div className="fco-training-coef">{s.coefficient}%</div>
              <div className="fco-training-base" style={{ color: base > 0 ? statColor(base) : 'var(--text-faint)' }}>
                {base > 0 ? base : '—'}
              </div>
              <div className="fco-training-controls">
                <button
                  type="button"
                  className="fco-training-btn"
                  disabled={!canSub}
                  onClick={() => setPoint(s.name, -1)}
                  aria-label={`Giảm điểm ${s.name}`}
                >−</button>
                <span className="fco-training-points">{pts > 0 ? `+${pts}` : '0'}</span>
                <button
                  type="button"
                  className="fco-training-btn"
                  disabled={!canAdd}
                  onClick={() => setPoint(s.name, 1)}
                  aria-label={`Tăng điểm ${s.name}`}
                >+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DetailView({ id, isAdmin, watch, onToggleWatch, onBack, onSelect, onCompare }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grade, setGrade] = useState(1);
  const [level, setLevel] = useState(1);
  const [teamColorBonus, setTeamColorBonus] = useState(0);
  const [isUpgradePanelOpen, setIsUpgradePanelOpen] = useState(false);
  const [activePosition, setActivePosition] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    setGrade(1);
    setLevel(1);
    setTeamColorBonus(0);
    setIsUpgradePanelOpen(false);
    setActivePosition('');
    fetchPlayerDetail(id)
      .then(res => { setData(res); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) return <LoadingDetail />;
  if (error || !data) return (
    <EmptyState icon={I.Alert} title="Không tải được cầu thủ"
      body={error || 'Đã xảy ra lỗi không xác định.'}
      action={<Button variant="outline" icon={I.ArrowLeft} onClick={onBack}>Quay lại</Button>} />
  );

  const { player, related } = data;
  const bonuses = getDetailBonusModel({ grade, level, teamColorBonus });
  const p = applyDetailBonuses(player, bonuses);
  const s = getSeason(p.season);
  const trust = getTrust(p.trust);
  const positionRatings = [{ code: OVR_POSITION, label: OVR_POSITION, value: p.ovr }, ...(p.positionRatings || [])];
  const defaultPosition = p.positionRatings?.find((rating) => rating.recommended)?.label || OVR_POSITION;
  const selectedStatPosition = activePosition || defaultPosition;
  const headerRating = positionRatings.find((rating) => rating.label === defaultPosition);
  const displayedOvr = headerRating?.value ?? p.ovr;
  const headerPositions = expandPositionLabel(defaultPosition);
  const ratingByLabel = new Map();
  (p.positionRatings || []).forEach((rating) => {
    const keys = expandPositionLabel(rating.label);
    (keys.length ? keys : [rating.label]).forEach((key) => ratingByLabel.set(key, rating));
  });
  const displayedPositions = headerPositions.length
    ? [...headerPositions, ...(p.positions || []).filter((pos) => !headerPositions.includes(pos))]
    : p.positions;
  const displayedPositionRatings = displayedPositions
    ?.map((pos) => ratingByLabel.get(pos) || { label: pos, value: null })
    .filter((rating) => rating.label !== OVR_POSITION);
  const statOrder = getStatOrderForPosition(selectedStatPosition);
  const bioItems = [
    p.nation,
    p.club,
    p.league,
    p.age ? `${p.age} tuổi` : '',
    p.birthDate,
    p.height ? `${p.height}cm / ${p.weight || '—'}kg` : '',
  ].filter(Boolean);
  const watched = watch.includes(p.id);

  return (
    <div className="fco-detail">
      {/* Breadcrumb */}
      <div className="fco-detail-top">
        <Button variant="ghost" size="sm" icon={I.ArrowLeft} onClick={onBack}>Database</Button>
        <div className="fco-breadcrumb">
          <I.ChevronRight size={13} />
          <span>{cleanName(p.name)}</span>
        </div>
        <div className="fco-detail-actions">
          <Button variant="outline" size="sm" icon={watched ? I.StarFill : I.Star}
            style={watched ? { color: '#f5c84b' } : {}}
            onClick={() => onToggleWatch(p.id)}>
            {watched ? 'Đã theo dõi' : 'Theo dõi'}
          </Button>
          <Button variant="outline" size="sm" icon={I.Compare} onClick={() => onCompare(p.id)}>So sánh</Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="fco-detail-grid">
        <div className="fco-detail-left">
          <div className="fa-detail-sheet" style={{ '--season-ring': s.ring }}>
            <div className="fa-detail-hero">
              <div className="fa-detail-main">
                <div className="fa-title-row">
                  <SeasonChip code={p.season} name={p.seasonName} img={p.seasonImg} full />
                  {isAdmin && trust && <TrustBadge id={p.trust} size="sm" />}
                </div>

                <div className="fa-name-block">
                  <div className="fa-rating-lockup">
                    <span className="fa-hero-ovr" style={{ color: statColor(displayedOvr) }}>{displayedOvr}</span>
                  </div>
                  <h1 className="fa-player-name">{cleanName(p.name)}</h1>
                </div>

                <div className="fa-position-pills">
                  {displayedPositionRatings?.map((rating, i) => (
                    <span key={rating.label} className={`${getPositionTone(rating.label)} ${i > 0 ? 'muted' : ''}`}>
                      <b>{rating.label}</b>
                      {rating.value != null && <strong>{rating.value}</strong>}
                    </span>
                  ))}
                </div>

                <div className="fa-bio-grid">
                  {bioItems.map((item) => <span key={item}>{item}</span>)}
                  {(p.foot || p.weakFoot) && (
                    <span className="fa-bio-foot">
                      <FootStars label="L" n={p.foot === 'left' ? 5 : p.weakFoot} dim={p.foot !== 'left'} />
                      <FootStars label="R" n={p.foot === 'right' ? 5 : p.weakFoot} dim={p.foot !== 'right'} />
                    </span>
                  )}
                  {p.skillMoves > 0 && (
                    <span className="fa-bio-skill">
                      <BioStars n={p.skillMoves} label="SKL" />
                    </span>
                  )}
                  {p.workRateAttack && (
                    <span className="fa-bio-workrate">
                      <WorkrateBadge attack={p.workRateAttack} defense={p.workRateDefense} />
                    </span>
                  )}
                  {p.reputation && (
                    <span className="fa-bio-reputation">
                      <FpBadge value={p.reputation} />
                    </span>
                  )}
                </div>

                <div className="fa-economy-row">
                  {p.price > 0 && <span><I.Coins size={12} />Giá <b>{formatCoins(p.price)}</b></span>}
                  {p.salary > 0 && <span><I.Wallet size={12} />Lương <b>{p.salary}</b></span>}
                  {p.ovrBoost > 0 && <span>OVR boost <b>+{p.ovrBoost}</b></span>}
                </div>
              </div>

              <div className="fa-player-art">
                <PlayerAvatar player={p} size={188} bare />
              </div>
            </div>

            <div className={`fa-upgrade-panel${isUpgradePanelOpen ? ' open' : ''}`}>
              <button
                type="button"
                className="fa-upgrade-summary"
                onClick={() => setIsUpgradePanelOpen((open) => !open)}
                aria-expanded={isUpgradePanelOpen}
              >
                <span className="fa-upgrade-label">UPGRADE</span>
                <span className="fa-upgrade-summary-text">
                  Grade +{grade} · Lvl {level} · Bonus +{teamColorBonus}
                </span>
                <I.ChevronDown size={16} className="fa-upgrade-chevron" />
              </button>
              {isUpgradePanelOpen && (
                <div className="fa-upgrade-controls">
                  <GradeSelector grade={grade} onChange={setGrade} />
                  <FlatBonusSelector title="Lvl" value={level} options={LEVEL_OPTIONS} onChange={setLevel} />
                  <FlatBonusSelector title="Bonus" value={teamColorBonus} options={BONUS_OPTIONS} onChange={setTeamColorBonus} />
                </div>
              )}
            </div>
          </div>

          {/* Korean banner */}
          {isAdmin && p.koreanRaw && (
            <div className="fco-banner kr">
              <I.Languages size={18} className="fco-banner-icon" />
              <div>
                <b>Metadata tiếng Hàn</b> — Tên gốc: <code className="fco-code">{p.koreanRaw}</code>
                <span className="fco-banner-sub">Cầu thủ chưa được dịch tên / đối chiếu sang tiếng Việt.</span>
              </div>
            </div>
          )}

          {/* Vị trí + Chỉ số */}
          <Panel title="Chỉ số" sub={selectedStatPosition} subTone={getPositionTone(selectedStatPosition)} className="fa-position-panel">
            <section className="perform">
              <PerformStats p={p} />
            </section>
            <section className="postlist">
              <div className="fa-position-row">
                {positionRatings.map((rating) => (
                  <button
                    key={rating.label}
                    type="button"
                    className={`fa-position-rating ${selectedStatPosition === rating.label ? 'on' : ''} ${rating.recommended ? 'rec' : ''}`}
                    onClick={() => setActivePosition(rating.label)}
                  >
                    <span>{rating.recommended && <I.Star size={10} fill="currentColor" />}{rating.label}</span>
                    <strong style={{ color: statColor(rating.value) }}>{rating.value}</strong>
                  </button>
                ))}
              </div>
            </section>
            <TabbedPanel className="attrwrap fa-detail-attrwrap" tabs={[
              {
                key: 'stats',
                label: 'Chỉ số',
                show: true,
                content: p.detailed
                  ? <AllStats p={p} position={selectedStatPosition} />
                  : <MainOnlyStats p={p} order={statOrder} />,
              },
              {
                key: 'training',
                label: 'Đào tạo OVR',
                show: selectedStatPosition !== 'OVR',
                content: <TrainingOvrTab
                  p={p}
                  position={selectedStatPosition}
                />,
              },
            ]} />
          </Panel>

          {/* Kỹ năng ẩn + Lịch sử CLB (tabbed) */}
          <TabbedPanel tabs={[
            {
              key: 'traits',
              label: 'Kỹ năng ẩn',
              count: (p.traitsDescription?.length || p.traits?.length) || null,
              show: p.traitsDescription?.length > 0 || p.traits?.length > 0,
              content: p.traitsDescription?.length > 0 ? (
                <div className="fco-traits-detail">
                  {p.traitsDescription.map((td, i) => (
                    <div key={i} className="fco-trait-desc-item">
                      <div className="fco-trait-desc-name">
                        {td.iconUrl
                          ? <img className="fco-trait-icon" src={td.iconUrl} alt="" onError={e => { e.target.style.display = 'none'; }} />
                          : <I.Zap size={15} style={{ color: 'var(--accent)' }} />}
                        <span>{td.name}</span>
                      </div>
                      <div className="fco-trait-desc-text">{td.description || 'Chưa có mô tả cho kỹ năng này.'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="fco-traits">
                  {p.traits.map((t, i) => (
                    <span key={i} className="fco-trait"><I.Zap size={12} />{t}</span>
                  ))}
                </div>
              ),
            },
            {
              key: 'clubs',
              label: 'Lịch sử CLB',
              show: p.teamColor?.length > 0 || p.clubCareer?.length > 0,
              content: (
                <>
                  {p.teamColor?.length > 0 && (
                    <div className="fco-tags">
                      {p.teamColor.map((tc, i) => <span key={i} className="fco-tag">{tc}</span>)}
                    </div>
                  )}
                  {p.clubCareer?.length > 0 && (
                    <div className={`fco-club-history${p.teamColor?.length > 0 ? ' mt' : ''}`}>
                      {p.clubCareer.map((c, i) => (
                        <div key={i} className="fco-club-history-row">
                          <span className="fco-club-history-team">{c.team}</span>
                          {c.season && <span className="fco-club-history-season">{c.season}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ),
            },
          ]} />
        </div>

        <div className="fco-detail-right">
          <MonetizationSlot
            placement="player_detail_sidebar"
            entity={p.id ? { type: 'player', id: String(p.id) } : null}
            className="space-y-3"
          />

          {/* Trust (admin) */}
          {isAdmin && trust && (
            <div className="fco-panel">
              <div className="fco-panel-head"><div className="fco-panel-title">Độ tin cậy dữ liệu</div></div>
              <div className="fco-panel-body">
                <div className="fco-trust-row">
                  <span className="fco-trust-big" style={{ color: trust.color, borderColor: trust.color + '44', background: trust.color + '12' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: trust.dot, boxShadow: `0 0 6px ${trust.dot}` }} />
                    {trust.vi}
                  </span>
                </div>
                <p className="fco-trust-desc">{trust.desc}</p>
                <div className="fco-trust-srcs">
                  <div className="fco-src">
                    <span className={`fco-src-dot ${p._raw?.spid ? 'ok' : 'miss'}`} />
                    Nexon Open API
                    {p._raw?.spid && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>spid:{p.spid}</span>}
                  </div>
                  <div className="fco-src">
                    <span className={`fco-src-dot ${p._raw?.enrichment ? 'ok' : 'miss'}`} />
                    FIFAAddict (vn.fifaaddict.com)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related seasons */}
      {related?.length > 0 && (
        <div className="fco-panel">
          <div className="fco-panel-head">
            <div className="fco-panel-title">
              <I.Layers size={15} />
              Các phiên bản khác
              <span className="fco-panel-title-sub">{related.length} thẻ</span>
            </div>
          </div>
          <div className="fco-panel-body">
            <div className="fco-relgrid">
              {[...related].sort((a, b) => (b.ovr ?? 0) - (a.ovr ?? 0)).map(r => (
                <div key={r.id} className="fco-relcard" onClick={() => onSelect(r.id)}>
                  <PlayerAvatar player={r} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cleanName(r.name)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <SeasonChip code={r.season} name={r.seasonName} img={r.seasonImg} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: statColor(r.ovr), fontWeight: 700 }}>{r.ovr}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const WR_LABEL = { high: 'High', medium: 'Medium', mid: 'Medium', low: 'Low' };
const WR_COLOR = { high: '#f97316', medium: '#facc15', mid: '#facc15', low: '#60a5fa' };

function FootStars({ label, n, dim }) {
  return (
    <span className={`fa-foot-col${dim ? ' dim' : ''}`}>
      <span className="fa-foot-label">{label}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" className={`fa-star${i < n ? ' on' : ''}`} fill="inherit">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function BioStars({ n, label }) {
  return (
    <span className="fa-bio-stars-wrap">
      <span className="fa-bio-stars-label">{label}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" className={`fa-star${i < n ? ' on' : ''}`} fill="inherit">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function WorkrateBadge({ attack, defense }) {
  const a = (attack || '').toLowerCase();
  const d = (defense || '').toLowerCase();
  return (
    <span className="fa-workrate-badge">
      <span className="fa-wr-label">Workrate</span>
      <span style={{ color: WR_COLOR[a] || '#aab0ba' }}>{WR_LABEL[a] || a}</span>
      <span className="fa-wr-sep">/</span>
      <span style={{ color: WR_COLOR[d] || '#aab0ba' }}>{WR_LABEL[d] || d}</span>
    </span>
  );
}

const FP_COLOR = { legendary: '#f59e0b', gold: '#eab308', silver: '#94a3b8', bronze: '#b45309' };

function FpBadge({ value }) {
  const key = (value || '').toLowerCase();
  const color = FP_COLOR[key] || '#94a3b8';
  return (
    <span className="fa-fp-badge" style={{ borderColor: color, color }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fontSize="11" fill="#0d1015" fontWeight="bold">FP</text>
      </svg>
      {value}
    </span>
  );
}

function GradeSelector({ grade, onChange }) {
  return (
    <div className="fco-grade-selector" aria-label="FO4 Grade">
      <div className="fco-grade-title">
        <span>FO4 Grade</span>
        <strong>+{grade}</strong>
      </div>
      <div className="fco-grade-grid">
        {GRADE_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            className={`fco-grade-btn grade${value}${grade === value ? ' on' : ''}`}
            onClick={() => onChange(value)}
            aria-pressed={grade === value}
            title={`Grade +${value}`}
          >
            +{value}
          </button>
        ))}
      </div>
    </div>
  );
}

function FlatBonusSelector({ title, value, options, onChange }) {
  return (
    <div className="fco-flat-bonus-selector" aria-label={title}>
      <div className="fco-grade-title">
        <span>{title}</span>
        <strong>{title === 'Lvl' ? value : `+${value}`}</strong>
      </div>
      <div className="fco-flat-bonus-grid">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`fco-flat-bonus-btn${option === value ? ' on' : ''}`}
            onClick={() => onChange(option)}
            aria-pressed={option === value}
            title={`${title} ${title === 'Lvl' ? option : `+${option}`}`}
          >
            {title === 'Lvl' ? option : `+${option}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function AttrLine({ label, value }) {
  return (
    <li className="foflex attr fco-attr-line">
      <span className="fco-attr-line-lab">{label}</span>
      <span className="fco-attr-line-val" style={{ color: value != null ? statColor(value) : 'var(--text-faint)' }}>
        {value != null ? value : '—'}
      </span>
    </li>
  );
}

function PerformStats({ p }) {
  const groups = Object.fromEntries(buildStatGroups(p, DEFAULT_STAT_ORDER).map((group) => [group.key, group]));
  const mainStats = [
    { key: 'pace', label: 'Tốc độ', value: groups.pace?.value },
    { key: 'shooting', label: 'Sút', value: groups.shooting?.value },
    { key: 'passing', label: 'Chuyền', value: groups.passing?.value },
    { key: 'dribbling', label: 'Rê bóng', value: groups.dribbling?.value },
    { key: 'defending', label: 'Phòng thủ', value: groups.defending?.value },
    { key: 'physical', label: 'Thể lực', value: groups.physical?.value },
  ];

  return (
    <ul className="foflex fa-perform-list">
      {mainStats.map((stat) => (
        <li key={stat.key}>
          <span className="name">{stat.label}</span>
          <b className="value" style={{ color: stat.value != null ? statColor(stat.value) : 'var(--text-faint)' }}>
            {stat.value ?? '—'}
          </b>
        </li>
      ))}
    </ul>
  );
}

function AllStats({ p, position }) {
  const subOrder = getSubStatOrderForPosition(position);
  const subRank = new Map(subOrder.map((key, index) => [key, index]));
  const byKey = new Map();

  FLAT_SUB_STAT_ORDER.forEach(({ group, label }, index) => {
    const stat = (p.detailed?.[group] || []).find((item) => item.label === label);
    if (stat?.value != null) byKey.set(label, { ...stat, label, group, index });
  });

  GK_STAT_GROUPS.forEach((group, index) => {
    const value = p.detailed?.gk?.[group.key] ?? null;
    if (value != null) {
      byKey.set(`gk:${group.label}`, {
        label: group.label,
        value,
        group: 'gk',
        index: FLAT_SUB_STAT_ORDER.length + index,
      });
    }
  });

  const flatStats = [...byKey.values()].sort((a, b) => {
    const aRank = subRank.get(getSubStatOrderKey(a));
    const bRank = subRank.get(getSubStatOrderKey(b));
    const safeARank = aRank ?? subOrder.length + a.index;
    const safeBRank = bRank ?? subOrder.length + b.index;
    return safeARank - safeBRank || a.index - b.index;
  });

  return (
    <ul className="fa-attribute-grid">
      {flatStats.map((stat) => (
        <AttrLine key={getSubStatOrderKey(stat)} label={stat.label} value={stat.value} />
      ))}
    </ul>
  );
}

function MainOnlyStats({ p, order }) {
  const vals = buildStatGroups(p, order).filter((group) => group.value != null);
  return (
    <>
      <ul className="fa-attribute-grid fa-mainonly-attrgrid">
        {vals.map((group) => (
          <AttrLine key={group.key} label={group.label} value={group.value} />
        ))}
      </ul>
      <div className="fco-locked-note">
        <I.Lock size={14} />
        Chưa có chỉ số chi tiết — cần đồng bộ FIFAAddict
      </div>
    </>
  );
}

function buildStatGroups(p, order) {
  const byKey = Object.fromEntries(STAT_GROUPS.map((group) => [group.key, {
    ...group,
    value: p[group.key],
    subs: p.detailed?.[group.key] || [],
  }]));

  const gkStats = GK_STAT_GROUPS.map((group) => ({ label: group.label, value: p.detailed?.gk?.[group.key] ?? null }));
  const gkValues = gkStats.map((stat) => stat.value).filter((value) => value != null);
  byKey.gk = {
    ...GK_GROUP,
    value: gkValues.length ? Math.round(gkValues.reduce((sum, value) => sum + value, 0) / gkValues.length) : null,
    subs: gkStats,
  };

  return [...order, ...DEFAULT_STAT_ORDER.filter((key) => !order.includes(key))]
    .map((key) => byKey[key])
    .filter(Boolean);
}

function LoadingDetail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ height: 42, borderRadius: 10, background: 'var(--surface-2)' }} className="fco-sk" />
      <div style={{ height: 160, borderRadius: 16, background: 'var(--surface)' }} className="fco-sk" />
      <div style={{ height: 320, borderRadius: 14, background: 'var(--surface)' }} className="fco-sk" />
    </div>
  );
}
