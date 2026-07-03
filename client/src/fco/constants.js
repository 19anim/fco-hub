export const SEASONS_META = {
  ICON:   { name: "ICON",                   fg: "#2a1c0a", bg: "linear-gradient(135deg,#f4e2bd,#d9b878)", ring: "#e7cd95" },
  ICONTM: { name: "ICON The Moment",        fg: "#2a1c0a", bg: "linear-gradient(135deg,#f4e2bd,#d9b878)", ring: "#e7cd95" },
  TOTY:   { name: "Team of the Year",       fg: "#eaf2ff", bg: "linear-gradient(135deg,#0b2a6b,#1649a8)", ring: "#3f6fd8" },
  TOTS:   { name: "Team of the Season",     fg: "#241c00", bg: "linear-gradient(135deg,#ffe14d,#f5b400)", ring: "#ffd23d" },
  LH:     { name: "Loyal Heroes",           fg: "#062018", bg: "linear-gradient(135deg,#27e0a3,#0fae7a)", ring: "#21c98f" },
  LIVE:   { name: "Live",                   fg: "#062018", bg: "linear-gradient(135deg,#27e0a3,#0fae7a)", ring: "#21c98f" },
  NHD:    { name: "New Heroes",             fg: "#08221f", bg: "linear-gradient(135deg,#39d6d0,#1796a6)", ring: "#2bc1c2" },
  MOTM:   { name: "Man of the Match",       fg: "#f4eaff", bg: "linear-gradient(135deg,#3a1163,#6a25b8)", ring: "#7e3fcf" },
  TKI:    { name: "Toty Kit Icons",         fg: "#1a1305", bg: "linear-gradient(135deg,#f0c060,#caa23c)", ring: "#e0b450" },
  UP:     { name: "Up Grade",               fg: "#eef4ff", bg: "linear-gradient(135deg,#243245,#3a4f6e)", ring: "#46618a" },
  BTB:    { name: "Back to Back",           fg: "#22060a", bg: "linear-gradient(135deg,#ff7a7a,#e23b5a)", ring: "#f2566f" },
  VNL:    { name: "Vietnam Legends",        fg: "#fff",    bg: "linear-gradient(135deg,#da251d,#ff4d4d)", ring: "#ffcc00" },
  VN:     { name: "Vietnam",                fg: "#fff",    bg: "linear-gradient(135deg,#da251d,#ff4d4d)", ring: "#ffcc00" },
  PRM:    { name: "Prime",                  fg: "#000",    bg: "linear-gradient(135deg,#00e08a,#8cffdb)", ring: "#00e08a" },
  IPRM:   { name: "Infinite Prime",         fg: "#000",    bg: "linear-gradient(135deg,#00e08a,#8cffdb)", ring: "#00e08a" },
  NG:     { name: "Normal",                 fg: "#cfd6df", bg: "linear-gradient(135deg,#2a313c,#1c222b)", ring: "#39424f" },
};

export const POSITION_BASE_ALIASES = Object.freeze({
  LS: 'ST',
  RS: 'ST',
  LF: 'CF',
  RF: 'CF',
  LCB: 'CB',
  RCB: 'CB',
  LCM: 'CM',
  RCM: 'CM',
  LDM: 'CDM',
  RDM: 'CDM',
  LAM: 'CAM',
  RAM: 'CAM',
  LWB: 'LB',
  RWB: 'RB',
});

export function resolvePositionCode(pos) {
  const upperPos = String(pos || '').toUpperCase();
  return POSITION_BASE_ALIASES[upperPos] || upperPos;
}

export const POSITIONS_META = {
  GK:  { group: "GK",  color: "#f5c84b" },
  CB:  { group: "DEF", color: "#37a0ff" }, LCB: { group: "DEF", color: "#37a0ff" }, RCB: { group: "DEF", color: "#37a0ff" },
  RB:  { group: "DEF", color: "#37a0ff" }, LB: { group: "DEF", color: "#37a0ff" },
  RWB: { group: "DEF", color: "#37a0ff" }, LWB:{ group: "DEF", color: "#37a0ff" },
  CDM: { group: "MID", color: "#00e08a" }, LDM: { group: "MID", color: "#00e08a" }, RDM: { group: "MID", color: "#00e08a" },
  CM:  { group: "MID", color: "#00e08a" }, LCM: { group: "MID", color: "#00e08a" }, RCM: { group: "MID", color: "#00e08a" },
  CAM: { group: "MID", color: "#00e08a" }, LAM:{ group: "MID", color: "#00e08a" }, RAM:{ group: "MID", color: "#00e08a" },
  RM:  { group: "MID", color: "#00e08a" }, LM: { group: "MID", color: "#00e08a" },
  RW:  { group: "FWD", color: "#ff7a59" }, LW: { group: "FWD", color: "#ff7a59" },
  CF:  { group: "FWD", color: "#ff7a59" }, LF: { group: "FWD", color: "#ff7a59" }, RF: { group: "FWD", color: "#ff7a59" },
  ST:  { group: "FWD", color: "#ff7a59" }, LS: { group: "FWD", color: "#ff7a59" }, RS: { group: "FWD", color: "#ff7a59" },
};

export const TRUST_META = {
  synced:         { label:"Synced",        vi:"Đã đồng bộ",     color:"#00e08a", dot:"#00e08a", desc:"Đã đồng bộ chỉ số & kỹ năng từ FIFAAddict." },
  verified:       { label:"Verified",      vi:"Đã xác minh",    color:"#00e08a", dot:"#00e08a", desc:"Khớp Nexon + enrich FIFAAddict, chỉ số đầy đủ." },
  matched:        { label:"Matched",       vi:"Đã khớp nguồn",  color:"#37a0ff", dot:"#37a0ff", desc:"Đã map sang FIFAAddict, chờ đồng bộ chi tiết." },
  enriched:       { label:"Enriched",      vi:"Đã làm giàu",    color:"#2dd4bf", dot:"#2dd4bf", desc:"Bổ sung chỉ số chi tiết & trait từ enrichment." },
  korean_raw:     { label:"Korean raw",    vi:"Metadata Hàn",   color:"#f5b942", dot:"#f5b942", desc:"Dữ liệu thô tiếng Hàn từ Nexon, chưa dịch/đối chiếu." },
  needs_review:   { label:"Needs review",  vi:"Cần kiểm tra",   color:"#ff8a3d", dot:"#ff8a3d", desc:"Có sai lệch giữa các nguồn, cần review thủ công." },
  missing_detail: { label:"Missing detail",vi:"Thiếu chi tiết", color:"#e2566f", dot:"#e2566f", desc:"Chưa có chỉ số chi tiết. Cần hydrate detail." },
};

export const POS_GROUPS = ["GK", "DEF", "MID", "FWD"];

export const SORTS = [
  { value: "ovr_desc",    label: "OVR cao → thấp" },
  { value: "ovr_asc",     label: "OVR thấp → cao" },
  { value: "price_desc",  label: "Giá cao → thấp" },
  { value: "price_asc",   label: "Giá thấp → cao" },
  { value: "salary_desc", label: "Lương cao → thấp" },
  { value: "salary_asc",  label: "Lương thấp → cao" },
  { value: "season",      label: "Mùa thẻ" },
  { value: "name",        label: "Tên A → Z" },
];

export const LS_KEY = "fco_hub_v1";
export { API_BASE } from '../config/api.js';
