export const Panel = ({ title, children }) => <section className="panel"><h3>{title}</h3>{children}</section>;
export const Stage = ({ title, children, legend }) => <section className="stage"><div className="row sp"><h3>{title}</h3>{legend && <div className="legend">{legend}</div>}</div>{children}</section>;
export const Slider = ({ label, value, min, max, step = 0.01, onChange, fmt = (v) => v.toFixed(2) }) => (
  <label className="sl"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} /><output>{fmt(value)}</output></label>
);
export const Cell = ({ k, v }) => <div className="cell"><small>{k}</small><b>{v}</b></div>;
export const Bridge = ({ rows }) => (
  <Panel title="Maths you know → where it shows up here">
    <table className="bridge"><tbody>{rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table>
  </Panel>
);
export const Check = ({ q, a }) => <details><summary>Check yourself: {q}</summary><p>{a}</p></details>;
export const Mat = ({ M, f }) => <div className="mat">{M.flat().map((z, i) => <span key={i}>{f(z)}</span>)}</div>;

// Small SVG line plot used by the branch twins. series: [{pts:[[x,y],...], color, dash, w}]
export function Plot({ series, xr, yr, xl, yl, mark, xticks, yticks, xfmt = (v) => v, yfmt = (v) => v, h = 250, xt = 5, yt = 4, bands = [], dots = [] }) {
  const W = 640, L = 62, Rr = 16, T = 12, B = 42, sx = (x) => L + ((x - xr[0]) / (xr[1] - xr[0])) * (W - L - Rr), sy = (y) => T + (1 - (y - yr[0]) / (yr[1] - yr[0])) * (h - T - B);
  const tk = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label={`${yl} versus ${xl}`}>
      <defs><clipPath id="clip"><rect x={L} y={T} width={W - L - Rr} height={h - T - B} /></clipPath></defs>
      {(yticks || tk(yr[0], yr[1], yt)).map((v) => <g key={'y' + v}><line x1={L} x2={W - Rr} y1={sy(v)} y2={sy(v)} stroke="#262c33" /><text x={L - 8} y={sy(v) + 4} fill="#8a949e" fontSize="11" textAnchor="end">{yfmt(v)}</text></g>)}
      {(xticks || tk(xr[0], xr[1], xt)).map((v) => <g key={'x' + v}><line y1={T} y2={h - B} x1={sx(v)} x2={sx(v)} stroke="#262c33" /><text x={sx(v)} y={h - B + 16} fill="#8a949e" fontSize="11" textAnchor="middle">{xfmt(v)}</text></g>)}
      {bands.map(([a, b, c], i) => <rect key={i} x={sx(a)} width={Math.max(0, sx(b) - sx(a))} y={T} height={h - T - B} fill={c} />)}
      <g clipPath="url(#clip)">{series.map((s, i) => <polyline key={i} fill="none" stroke={s.color} strokeWidth={s.w || 2.5} strokeDasharray={s.dash} points={s.pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} />)}</g>
      {mark != null && <line x1={sx(mark)} x2={sx(mark)} y1={T} y2={h - B} stroke="#f0a43a" strokeDasharray="4 3" />}
      {dots.map(([x, y, c], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r="6" fill={c} stroke="#0e1114" strokeWidth="2" />)}
      <text x={(L + W - Rr) / 2} y={h - 6} fill="#8a949e" fontSize="12" textAnchor="middle">{xl}</text>
      <text x="14" y={(T + h - B) / 2} fill="#8a949e" fontSize="12" textAnchor="middle" transform={`rotate(-90 14 ${(T + h - B) / 2})`}>{yl}</text>
    </svg>
  );
}
export const Story = ({ branch, quantum, maths }) => (
  <div className="panel" style={{ borderColor: 'var(--teal)' }}><div className="row" style={{ gap: 28, alignItems: 'flex-start' }}>
    <div style={{ flex: '1 1 200px' }}><small className="o" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.14em' }}>BRANCH STORY</small><div style={{ marginTop: 4 }}>{branch}</div></div>
    <div style={{ flex: '1 1 200px' }}><small className="t" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.14em' }}>QUANTUM IDEA</small><div style={{ marginTop: 4 }}>{quantum}</div></div>
    <div style={{ flex: '1 1 200px' }}><small className="p" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.14em' }}>MATHS YOU HAVE STUDIED</small><div style={{ marginTop: 4 }}>{maths}</div></div>
  </div></div>
);
export const Caveat = ({ children }) => <p className="note" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><b>Simplified on purpose:</b> {children}</p>;

// ================= additions for MathBench Seven =================
import { createContext, useContext, useEffect, useRef } from 'react';
export const GoCtx = createContext(() => {});
export const useGo = () => useContext(GoCtx);

const lerp = (a, b, t) => a + (b - a) * t;
function ramp(stops, t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], u = (t - t0) / (t1 - t0 || 1); return [lerp(c0[0], c1[0], u), lerp(c0[1], c1[1], u), lerp(c0[2], c1[2], u)]; }
  return stops[stops.length - 1][1];
}
const SEQ = [[0, [20, 23, 27]], [0.3, [17, 94, 88]], [0.62, [79, 214, 189]], [0.85, [246, 226, 122]], [1, [240, 130, 58]]];
const DIV = [[0, [106, 168, 255]], [0.5, [20, 23, 27]], [1, [240, 164, 58]]];
// Heat-map canvas. values: Float32/64Array of nx*ny. cmap 'seq' (0..1) or 'div' (-1..1). overlay(ctx, scale) draws on top.
export function Canvas2D({ nx, ny, values, vmin = 0, vmax = 1, cmap = 'seq', scale = 8, scaleX, scaleY, overlay, label, flipY = false }) {
  const sx = scaleX || scale, sy = scaleY || scale;
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d'); c.width = nx * sx; c.height = ny * sy;
    const off = document.createElement('canvas'); off.width = nx; off.height = ny; const o = off.getContext('2d'), img = o.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = values[(flipY ? ny - 1 - j : j) * nx + i], t = (v - vmin) / (vmax - vmin || 1), [r, g, b] = ramp(cmap === 'div' ? DIV : SEQ, cmap === 'div' ? (t) : t), k = 4 * (j * nx + i);
      img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    o.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, nx * sx, ny * sy); if (overlay) overlay(ctx, sx, sy);
  });
  return <canvas ref={ref} role="img" aria-label={label} style={{ width: '100%', maxWidth: nx * sx, display: 'block', margin: '0 auto', borderRadius: 8, border: '1px solid var(--line)' }} />;
}

// Fundamentals strip shown at the top of every equation tab
export const Fund = ({ n, name, eq, words, type, needs, solution }) => (
  <section className="panel" style={{ borderColor: 'var(--teal)' }}>
    <div className="row sp" style={{ alignItems: 'flex-start', gap: 22 }}>
      <div style={{ flex: '1 1 300px' }}>
        <small className="o" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.16em' }}>EQUATION {n} OF 7 · FUNDAMENTALS</small>
        <h2 style={{ font: '700 30px "Barlow Condensed"', margin: '4px 0 8px' }}>{name}</h2>
        <div style={{ font: '500 22px "JetBrains Mono"', color: 'var(--teal)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', whiteSpace: 'pre-wrap' }}>{eq}</div>
        <p className="note">{words}</p>
      </div>
      <div style={{ flex: '1 1 340px', display: 'grid', gap: 10, fontSize: 15 }}>
        <div><small className="t" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.14em' }}>WHAT KIND OF EQUATION</small><div>{type}</div></div>
        <div><small className="t" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.14em' }}>WHAT YOU MUST SUPPLY</small><div>{needs}</div></div>
        <div><small className="t" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.14em' }}>HOW IT IS SOLVED</small><div>{solution}</div></div>
      </div>
    </div>
  </section>
);

const TAGC = { Aerospace: '#6aa8ff', Mechanical: '#f0a43a', Biology: '#7bd88f', CSE: '#b98ad0', ECE: '#4fd6bd', EE: '#f0c24a', Civil: '#e08a6a' };
// Application preset cards: items = [{ tag, title, note, run }]
export const Apps = ({ items, current }) => (
  <Panel title="Applications: load a real case">
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((a) => (
        <button key={a.title} className={'btn' + (current === a.title ? ' on' : '')} onClick={a.run} style={{ textAlign: 'left', display: 'block', height: 'auto', padding: '10px 12px' }}>
          <span style={{ font: '500 11px "JetBrains Mono"', letterSpacing: '.1em', color: TAGC[a.tag] || 'var(--teal)' }}>{a.tag.toUpperCase()}</span>
          <div style={{ font: '600 17px "Barlow Condensed"' }}>{a.title}</div>
          <div style={{ font: '400 14px Barlow', color: 'var(--mut)' }}>{a.note}</div>
        </button>
      ))}
    </div>
  </Panel>
);
// "See also": jump to another equation
export function Links({ items }) {
  const go = useGo();
  return (
    <Panel title="Connects to">
      <div style={{ display: 'grid', gap: 8 }}>{items.map(([to, label, text]) => (
        <div key={to + label} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
          <button className="btn" onClick={() => go(to)} style={{ flex: '0 0 auto' }}>{label}</button><span className="note" style={{ margin: 0, flex: 1 }}>{text}</span>
        </div>))}
      </div>
    </Panel>
  );
}
export const Warn = ({ children }) => <div role="alert" style={{ border: '1px solid var(--red)', background: '#2a1618', color: '#ffb3b3', borderRadius: 10, padding: '10px 14px', margin: '8px 0' }}>{children}</div>;
export const fmtT = (s) => { const a = Math.abs(s); return a >= 3.15e7 * 1000 ? (s / 3.15e7).toExponential(2) + ' y' : a >= 3.15e7 ? (s / 3.15e7).toFixed(1) + ' years' : a >= 86400 ? (s / 86400).toFixed(1) + ' days' : a >= 3600 ? (s / 3600).toFixed(1) + ' h' : a >= 60 ? (s / 60).toFixed(1) + ' min' : a >= 1 ? s.toFixed(2) + ' s' : a >= 1e-3 ? (s * 1e3).toFixed(2) + ' ms' : a >= 1e-6 ? (s * 1e6).toFixed(1) + ' µs' : (s * 1e9).toFixed(1) + ' ns'; };
export const sci = (v, d = 2) => (v === 0 ? '0' : Math.abs(v) >= 0.01 && Math.abs(v) < 1e4 ? v.toPrecision(3) : v.toExponential(d).replace('e+', '×10^').replace('e-', '×10^-'));
