/**
 * Icons.tsx — Minimalist pure-View icon set for Roamers
 * All icons are geometric View components — no external SVG dependency.
 * Usage: <Icon.Mountain size={22} color="#B8172E" />
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';

interface P { size?: number; color?: string; style?: ViewStyle }

/* ── primitives ─────────────────────────────────────────────────── */
const Dot  = ({ s, c, r = 99 }: { s: number; c: string; r?: number }) => (
  <View style={{ width: s, height: s, borderRadius: r, backgroundColor: c }} />
);
const Ring = ({ s, c, t = 1.5 }: { s: number; c: string; t?: number }) => (
  <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: t, borderColor: c }} />
);
const Bar  = ({ w, h, c, r = 1 }: { w: number; h: number; c: string; r?: number }) => (
  <View style={{ width: w, height: h, backgroundColor: c, borderRadius: r }} />
);
const Tri  = ({ b, h, c, flip = false }: { b: number; h: number; c: string; flip?: boolean }) => (
  <View style={{
    width: 0, height: 0, borderStyle: 'solid',
    borderLeftWidth: b / 2, borderRightWidth: b / 2,
    ...(flip
      ? { borderBottomWidth: 0, borderTopWidth: h, borderTopColor: c }
      : { borderTopWidth: 0, borderBottomWidth: h, borderBottomColor: c }),
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  }} />
);

/* ── Mountain / Peaks ───────────────────────────────────────────── */
export function Mountain({ size = 22, color = '#fff', style }: P) {
  const s = size;
  return (
    <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }, style]}>
      {/* Sun dot */}
      <View style={{ position: 'absolute', top: 0, left: s * 0.12 }}>
        <Dot s={s * 0.18} c={color} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {/* small left peak */}
        <Tri b={s * 0.44} h={s * 0.52} c={color} />
        {/* tall right peak */}
        <View style={{ marginLeft: -s * 0.06 }}>
          <Tri b={s * 0.56} h={s * 0.68} c={color} />
        </View>
      </View>
    </View>
  );
}

/* ── Location Pin ───────────────────────────────────────────────── */
export function Pin({ size = 22, color = '#fff', style }: P) {
  const r = size * 0.28;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center' }, style]}>
      <Ring s={r * 2} c={color} t={1.8} />
      <Dot  s={r * 0.7} c={color} />
      <Bar  w={2} h={size * 0.32} c={color} r={1} />
      <View style={{ width: size * 0.22, height: size * 0.1, borderRadius: 4, backgroundColor: color, opacity: 0.5 }} />
    </View>
  );
}

/* ── Compass / Route ────────────────────────────────────────────── */
export function Compass({ size = 22, color = '#fff', style }: P) {
  const r = size * 0.44;
  return (
    <View style={[{ width: size, height: size, borderRadius: r, borderWidth: 1.6, borderColor: color, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View>
        <Tri b={size * 0.22} h={size * 0.24} c={color} />
        <Tri b={size * 0.22} h={size * 0.24} c={color + '55'} flip />
      </View>
    </View>
  );
}

/* ── Person ─────────────────────────────────────────────────────── */
export function Person({ size = 22, color = '#fff', style }: P) {
  return (
    <View style={[{ alignItems: 'center', height: size }, style]}>
      <Ring s={size * 0.44} c={color} t={1.7} />
      <View style={{ marginTop: size * 0.06, width: size * 0.82, height: size * 0.42, borderTopLeftRadius: size * 0.42, borderTopRightRadius: size * 0.42, borderWidth: 1.7, borderColor: color, borderBottomWidth: 0 }} />
    </View>
  );
}

/* ── Grid (4-square) ────────────────────────────────────────────── */
export function Grid({ size = 20, color = '#fff', style }: P) {
  const dot = Math.max(4, Math.round(size * 0.32));
  const gap = Math.max(2, Math.round(size * 0.1));
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ flexDirection: 'row', marginBottom: gap }}>
        <View style={{ width: dot, height: dot, borderRadius: 2, borderWidth: 1.5, borderColor: color, marginRight: gap }} />
        <View style={{ width: dot, height: dot, borderRadius: 2, borderWidth: 1.5, borderColor: color }} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: dot, height: dot, borderRadius: 2, borderWidth: 1.5, borderColor: color, marginRight: gap }} />
        <View style={{ width: dot, height: dot, borderRadius: 2, borderWidth: 1.5, borderColor: color }} />
      </View>
    </View>
  );
}

/* ── Tent / Voyage ──────────────────────────────────────────────── */
export function Tent({ size = 22, color = '#fff', style }: P) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }, style]}>
      {/* peak */}
      <Tri b={size * 0.82} h={size * 0.68} c={color} />
      {/* opening gap */}
      <View style={{ position: 'absolute', bottom: 0, width: size * 0.28, height: size * 0.28, borderTopLeftRadius: size * 0.14, borderTopRightRadius: size * 0.14, backgroundColor: '#0e0e0e' }} />
      {/* base line */}
      <Bar w={size * 0.92} h={1.5} c={color} r={1} />
    </View>
  );
}

/* ── Route / Sur Mesure ─────────────────────────────────────────── */
export function Route({ size = 22, color = '#fff', style }: P) {
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center' }, style]}>
      {/* start circle */}
      <View style={{ position: 'absolute', top: size * 0.08, left: 0 }}>
        <Ring s={size * 0.28} c={color} t={1.6} />
      </View>
      {/* curved path — approximated as two segments */}
      <View style={{ position: 'absolute', top: size * 0.35, left: size * 0.22, right: size * 0.22, height: 1.5, backgroundColor: color, opacity: 0.7, borderRadius: 1 }} />
      {/* end filled dot */}
      <View style={{ position: 'absolute', bottom: size * 0.08, right: 0 }}>
        <Dot s={size * 0.28} c={color} />
      </View>
    </View>
  );
}

/* ── Bookmark / Wishlist ────────────────────────────────────────── */
export function Bookmark({ size = 22, color = '#fff', style }: P) {
  const w = size * 0.62;
  const h = size * 0.85;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* outer rectangle */}
      <View style={{ width: w, height: h, borderWidth: 1.6, borderColor: color, borderRadius: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
        {/* V notch */}
        <Tri b={w} h={h * 0.28} c={color} flip />
      </View>
    </View>
  );
}

/* ── Globe / Passport ───────────────────────────────────────────── */
export function Globe({ size = 22, color = '#fff', style }: P) {
  const r = size * 0.44;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ position: 'absolute' }}>
        <Ring s={r * 2} c={color} t={1.6} />
      </View>
      {/* horizontal equator */}
      <View style={{ position: 'absolute', top: r - 0.75, left: 0, right: 0, height: 1.5, backgroundColor: color, opacity: 0.6 }} />
      {/* inner oval — vertical meridian */}
      <View style={{ position: 'absolute', width: r * 0.7, height: r * 2, borderRadius: r * 0.35, borderWidth: 1.5, borderColor: color, opacity: 0.6 }} />
    </View>
  );
}

/* ── Sliders / Settings ─────────────────────────────────────────── */
export function Sliders({ size = 22, color = '#fff', style }: P) {
  const lineH = 1.5;
  const dotS  = size * 0.22;
  return (
    <View style={[{ width: size, height: size, justifyContent: 'center' }, style]}>
      {/* line 1 — marker at 30% */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: size * 0.14 }}>
        <Bar w={size * 0.28} h={lineH} c={color} />
        <Dot s={dotS} c={color} />
        <Bar w={size - size * 0.28 - dotS} h={lineH} c={color} />
      </View>
      {/* line 2 — marker at 65% */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: size * 0.14 }}>
        <Bar w={size * 0.6} h={lineH} c={color} />
        <Dot s={dotS} c={color} />
        <Bar w={size - size * 0.6 - dotS} h={lineH} c={color} />
      </View>
      {/* line 3 — marker at 40% */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Bar w={size * 0.36} h={lineH} c={color} />
        <Dot s={dotS} c={color} />
        <Bar w={size - size * 0.36 - dotS} h={lineH} c={color} />
      </View>
    </View>
  );
}

/* ── Sun / Weekend ──────────────────────────────────────────────── */
export function Sun({ size = 22, color = '#fff', style }: P) {
  const r = size * 0.28;
  const rayLen = size * 0.14;
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {rays.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const dist = r + size * 0.04;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;
        return (
          <View
            key={deg}
            style={{
              position: 'absolute',
              width: 1.5,
              height: rayLen,
              backgroundColor: color,
              borderRadius: 1,
              left: size / 2 + x - 0.75,
              top:  size / 2 + y - rayLen / 2,
              transform: [{ rotate: `${deg + 90}deg` }],
            }}
          />
        );
      })}
      <Dot s={r * 2} c={color} />
    </View>
  );
}

/* ── Group / People ─────────────────────────────────────────────── */
export function Group({ size = 22, color = '#fff', style }: P) {
  const headS = size * 0.32;
  const bodyW = size * 0.5;
  const bodyH = size * 0.26;
  const offset = size * 0.2;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }, style]}>
      {/* back person head */}
      <View style={{ position: 'absolute', top: 0, left: size * 0.5 - offset / 2 }}>
        <Ring s={headS} c={color + '80'} t={1.5} />
      </View>
      {/* back person body */}
      <View style={{ position: 'absolute', bottom: 0, left: size * 0.5 - offset / 2 + headS * 0.1, width: bodyW * 0.8, height: bodyH, borderTopLeftRadius: bodyH, borderTopRightRadius: bodyH, borderWidth: 1.5, borderColor: color + '80', borderBottomWidth: 0 }} />
      {/* front person head */}
      <View style={{ position: 'absolute', top: 0, right: size * 0.5 - offset / 2 }}>
        <Ring s={headS} c={color} t={1.5} />
      </View>
      {/* front person body */}
      <View style={{ position: 'absolute', bottom: 0, right: size * 0.5 - offset / 2 + headS * 0.1, width: bodyW * 0.8, height: bodyH, borderTopLeftRadius: bodyH, borderTopRightRadius: bodyH, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0 }} />
    </View>
  );
}

/* ── Shield / Secure ────────────────────────────────────────────── */
export function Shield({ size = 22, color = '#fff', style }: P) {
  const w = size * 0.74;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{
        width: w,
        height: size * 0.82,
        borderWidth: 1.6,
        borderColor: color,
        borderTopLeftRadius: size * 0.15,
        borderTopRightRadius: size * 0.15,
        borderBottomLeftRadius: w * 0.5,
        borderBottomRightRadius: w * 0.5,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* check mark inside */}
        <View style={{ width: size * 0.25, height: size * 0.14, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: color, transform: [{ rotate: '-45deg' }], marginTop: -size * 0.04 }} />
      </View>
    </View>
  );
}

/* ── Leaf / Impact ──────────────────────────────────────────────── */
export function Leaf({ size = 22, color = '#fff', style }: P) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* leaf shape: circle squished + rotated */}
      <View style={{
        width: size * 0.62,
        height: size * 0.78,
        borderRadius: size * 0.31,
        borderWidth: 1.6,
        borderColor: color,
        transform: [{ rotate: '30deg' }],
      }} />
      {/* stem */}
      <View style={{ position: 'absolute', bottom: size * 0.04, left: size * 0.44, width: 1.5, height: size * 0.34, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

/* ── Trophy / Award ─────────────────────────────────────────────── */
export function Trophy({ size = 22, color = '#fff', style }: P) {
  const cupW = size * 0.72;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }, style]}>
      {/* cup body */}
      <View style={{ width: cupW, height: size * 0.52, borderWidth: 1.6, borderColor: color, borderTopLeftRadius: size * 0.1, borderTopRightRadius: size * 0.1, borderBottomLeftRadius: size * 0.22, borderBottomRightRadius: size * 0.22, marginBottom: size * 0.04 }} />
      {/* handles */}
      <View style={{ position: 'absolute', top: size * 0.05, left: size * 0.08, width: size * 0.12, height: size * 0.22, borderTopRightRadius: size * 0.1, borderBottomRightRadius: size * 0.1, borderWidth: 1.5, borderColor: color, borderLeftWidth: 0 }} />
      <View style={{ position: 'absolute', top: size * 0.05, right: size * 0.08, width: size * 0.12, height: size * 0.22, borderTopLeftRadius: size * 0.1, borderBottomLeftRadius: size * 0.1, borderWidth: 1.5, borderColor: color, borderRightWidth: 0 }} />
      {/* stem */}
      <Bar w={size * 0.16} h={size * 0.16} c={color} r={1} />
      {/* base */}
      <Bar w={size * 0.62} h={size * 0.1} c={color} r={2} />
    </View>
  );
}

/* ── Calendar / Booking ─────────────────────────────────────────── */
export function Calendar({ size = 22, color = '#fff', style }: P) {
  const w = size * 0.86;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: w, height: size * 0.82, borderWidth: 1.6, borderColor: color, borderRadius: 4, overflow: 'hidden' }}>
        {/* header strip */}
        <View style={{ width: '100%', height: size * 0.24, backgroundColor: color, opacity: 0.9 }} />
        {/* grid dots */}
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: size * 0.06, paddingVertical: size * 0.04, justifyContent: 'space-between' }}>
          {[...Array(6)].map((_, i) => (
            <Dot key={i} s={size * 0.12} c={color} />
          ))}
        </View>
      </View>
      {/* hanger lines */}
      <View style={{ position: 'absolute', top: size * 0.04, left: w * 0.25 + size * 0.07, width: 2, height: size * 0.16, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: size * 0.04, right: w * 0.25 + size * 0.07, width: 2, height: size * 0.16, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

/* ── Logout / Exit ──────────────────────────────────────────────── */
export function Logout({ size = 22, color = '#fff', style }: P) {
  const boxS = size * 0.74;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* box — 3 sides open on right */}
      <View style={{ position: 'absolute', width: boxS, height: boxS, borderWidth: 1.6, borderColor: color, borderRadius: 4, borderRightWidth: 0 }} />
      {/* arrow pointing right */}
      <View style={{ position: 'absolute', right: 0, flexDirection: 'row', alignItems: 'center' }}>
        <Bar w={size * 0.44} h={1.8} c={color} r={1} />
        <Tri b={size * 0.22} h={size * 0.22} c={color} />
      </View>
    </View>
  );
}

/* ── Star ───────────────────────────────────────────────────────── */
export function Star({ size = 18, color = '#fff', style }: P) {
  const s = size;
  /* 5-pointed star via 10 lines — approximated with rings + overlay trick */
  return (
    <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* outer ring representing star */}
      <View style={{ width: s * 0.82, height: s * 0.82, borderRadius: s * 0.41, borderWidth: 1.5, borderColor: color }} />
      <Dot s={s * 0.18} c={color} />
    </View>
  );
}

/* ── Roamers ─ (R mark) ─────────────────────────────────────────── */
export function RoamersR({ size = 28, color = '#B8172E', bg = 'transparent', style }: P & { bg?: string }) {
  return (
    <View style={[{
      width: size, height: size, borderRadius: size * 0.26,
      backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
      borderWidth: bg === 'transparent' ? 1.5 : 0, borderColor: color,
    }, style]}>
      <Mountain size={size * 0.66} color={color} />
    </View>
  );
}

/* ── Search / Magnifying glass ──────────────────────────────────── */
export function Search({ size = 22, color = '#fff', style }: P) {
  const t = Math.max(1.5, size * 0.08);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={{ position: 'absolute', top: 0, left: 0 }}>
        <Ring s={size * 0.62} c={color} t={t} />
      </View>
      <View style={{
        position: 'absolute', bottom: size * 0.08, right: size * 0.08,
        width: size * 0.38, height: t,
        backgroundColor: color, borderRadius: t / 2,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  );
}

/* ── Close / X ───────────────────────────────────────────────────── */
export function Close({ size = 18, color = '#fff', style }: P) {
  const t = Math.max(1.5, size * 0.1);
  const l = size * 0.7;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ position: 'absolute', width: l, height: t, backgroundColor: color, borderRadius: t / 2, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: l, height: t, backgroundColor: color, borderRadius: t / 2, transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

/* ── Flash / Lightning ───────────────────────────────────────────── */
export function Flash({ size = 22, color = '#fff', style }: P) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* top half — slanted bar going down-right */}
      <View style={{ position: 'absolute', top: 0, right: size * 0.12, width: size * 0.5, height: size * 0.52, borderBottomWidth: 0, borderTopWidth: 0 }}>
        <Bar w={size * 0.46} h={size * 0.52} c={color} r={2} />
      </View>
      {/* bolt shape via triangles stacked */}
      <View style={{ width: size * 0.42, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Tri b={size * 0.42} h={size * 0.48} c={color} />
        <View style={{ marginTop: -size * 0.06 }}>
          <Tri b={size * 0.32} h={size * 0.42} c={color} />
        </View>
      </View>
    </View>
  );
}

/* ── named export object for convenience ──────────────────────────── */
const Icon = {
  Mountain, Pin, Compass, Person, Grid, Tent,
  Route, Bookmark, Globe, Sliders, Sun, Group,
  Shield, Leaf, Trophy, Calendar, Logout, Star, RoamersR,
  Search, Close, Flash,
};
export default Icon;
