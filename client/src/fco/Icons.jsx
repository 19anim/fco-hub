function mk(paths, opts) {
  return function Icon({ size = 16, stroke = 2, className = '', style, ...rest }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size} height={size}
        viewBox="0 0 24 24"
        fill={opts?.fill ? 'currentColor' : 'none'}
        stroke={opts?.fill ? 'none' : 'currentColor'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        {...rest}
      >
        {paths.map((d, i) => {
          if (typeof d === 'string') return <path key={i} d={d} />;
          const { t, ...props } = d;
          const El = t;
          return <El key={i} {...props} />;
        })}
      </svg>
    );
  };
}

const C = (cx, cy, r) => ({ t: 'circle', cx, cy, r });
const L = (x1, y1, x2, y2) => ({ t: 'line', x1, y1, x2, y2 });
const RECT = (x, y, w, h, rx) => ({ t: 'rect', x, y, width: w, height: h, rx });

export const Search    = mk(['m21 21-4.3-4.3', C(11,11,8)]);
export const X         = mk(['M18 6 6 18','m6 6 12 12']);
export const ChevronDown  = mk(['m6 9 6 6 6-6']);
export const ChevronUp    = mk(['m18 15-6-6-6 6']);
export const ChevronRight = mk(['m9 18 6-6-6-6']);
export const ChevronLeft  = mk(['m15 18-6-6 6-6']);
export const ArrowLeft    = mk(['m12 19-7-7 7-7','M19 12H5']);
export const ArrowUpDown  = mk(['m21 16-4 4-4-4','M17 20V4','m3 8 4-4 4 4','M7 4v16']);
export const ArrowUp      = mk(['m5 12 7-7 7 7','M12 19V5']);
export const ArrowDown    = mk(['M12 5v14','m19 12-7 7-7-7']);
export const Sliders      = mk([L(4,21,4,14),L(4,10,4,3),L(12,21,12,12),L(12,8,12,3),L(20,21,20,16),L(20,12,20,3),L(2,14,6,14),L(10,8,14,8),L(18,16,22,16)]);
export const Star         = mk(['M11.5 2.3 14.4 8l6.4.9-4.6 4.5 1.1 6.3L11.5 17l-5.7 3 1.1-6.3L2.3 9l6.4-.9z']);
export const StarFill     = mk(['M11.5 2.3 14.4 8l6.4.9-4.6 4.5 1.1 6.3L11.5 17l-5.7 3 1.1-6.3L2.3 9l6.4-.9z'],{fill:true});
export const Shield       = mk(['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']);
export const ShieldCheck  = mk(['M20 13c0 5-3.5 7.5-7.7 9-4.2-1.5-7.7-4-7.7-9V6l7.7-3L20 6z','m9 12 2 2 4-4']);
export const Database     = mk([{t:'ellipse',cx:12,cy:5,rx:9,ry:3},'M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5','M3 12c0 1.7 4 3 9 3s9-1.3 9-3']);
export const Users        = mk(['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',C(9,7,4),'M22 21v-2a4 4 0 0 0-3-3.9','M16 3.1a4 4 0 0 1 0 7.8']);
export const Layers       = mk(['m12.8 2.5 8.5 4.2a.8.8 0 0 1 0 1.4l-8.5 4.2a1.8 1.8 0 0 1-1.6 0L2.7 8.1a.8.8 0 0 1 0-1.4l8.5-4.2a1.8 1.8 0 0 1 1.6 0z','m22 12.5-9.2 4.6a1.8 1.8 0 0 1-1.6 0L2 12.5','m22 17-9.2 4.6a1.8 1.8 0 0 1-1.6 0L2 17']);
export const Trophy       = mk(['M6 9a6 6 0 0 0 12 0V3H6z','M6 5H4a2 2 0 0 0 0 4h2','M18 5h2a2 2 0 0 1 0 4h-2','M9 21h6','M12 15v6']);
export const Eye          = mk(['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z',C(12,12,3)]);
export const Bookmark     = mk(['M19 21l-7-5-7 5V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z']);
export const Settings     = mk([C(12,12,3),'M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 .9 2.8H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z']);
export const Refresh      = mk(['M3 12a9 9 0 0 1 15-6.7L21 8','M21 3v5h-5','M21 12a9 9 0 0 1-15 6.7L3 16','M3 21v-5h5']);
export const Check        = mk(['M20 6 9 17l-5-5']);
export const Alert        = mk(['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',L(12,9,12,13),L(12,17,12.01,17)]);
export const Info         = mk([C(12,12,10),L(12,16,12,12),L(12,8,12.01,8)]);
export const Coins        = mk([C(8,8,6),'M18.1 6.5a6 6 0 0 1 0 11','M8 12h.01','M6 8h4']);
export const Wallet       = mk(['M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5',C(17.5,12.5,1.2)]);
export const Activity     = mk(['M22 12h-4l-3 9L9 3l-3 9H2']);
export const Zap          = mk(['M13 2 3 14h7l-1 8 10-12h-7z']);
export const External     = mk(['M15 3h6v6','M10 14 21 3','M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6']);
export const Plus         = mk([L(12,5,12,19),L(5,12,19,12)]);
export const Minus        = mk([L(5,12,19,12)]);
export const Compare      = mk(['M16 3h5v5','M21 3l-7 7','M8 21H3v-5','M3 21l7-7','M3 8V3h5','M21 16v5h-5']);
export const Hammer       = mk(['m15 12-8.4 8.4a2 2 0 0 1-2.8-2.8L12 9','M17.6 6.4 14 10','m21 3-6 6','m6.5 12.5 5 5','M18 4l2 2']);
export const Calendar     = mk([RECT(3,4,18,18,2),L(16,2,16,6),L(8,2,8,6),L(3,10,21,10)]);
export const Spinner      = mk(['M21 12a9 9 0 1 1-6.2-8.5']);
export const Clock        = mk([C(12,12,10),'M12 6v6l4 2']);
export const List         = mk([L(8,6,21,6),L(8,12,21,12),L(8,18,21,18),L(3,6,3.01,6),L(3,12,3.01,12),L(3,18,3.01,18)]);
export const Lock         = mk([RECT(3,11,18,11,2),'M7 11V7a5 5 0 0 1 10 0v4']);
export const Languages    = mk(['m5 8 6 6','m4 14 6-6 2-3','M2 5h12','M7 2h1','m22 22-5-10-5 10','M14 18h6']);
