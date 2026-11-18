import { useEffect, useMemo, useState } from 'react';
import * as E from '../lib/engines.js';
import { Panel, Stage, Slider, Cell, Bridge, Check, Plot, Caveat, Fund, Apps, Links, Warn, Canvas2D, fmtT, sci } from '../ui.jsx';

const NX = 201;
const BCS = { ff: 'fixed – fixed', fx: 'fixed – free', xx: 'free – free' };
const PRE = [
  { tag: 'Mechanical', title: 'Guitar string, plucked near the end', note: 'L = 0.648 m, c ≈ 427 m/s gives f₁ ≈ 330 Hz (E4). Plucking near the bridge fills the sound with harmonics.', set: { init: 'pluck', p: 0.15, bc: 'ff', L: 0.648, c: 427, what: 'string' } },
  { tag: 'Civil', title: 'Soil layer over bedrock (earthquake)', note: '30 m of soil, shear-wave speed 200 m/s. Fixed at bedrock, free at the surface: f₁ = c/4H ≈ 1.7 Hz, close to tall-building frequencies.', set: { init: 'pulse', p: 0.5, bc: 'fx', L: 30, c: 200, what: 'soil column' } },
  { tag: 'ECE', title: 'Transmission-line stub (shorted end, open end)', note: '1 m of cable, signals at 2×10⁸ m/s. A pulse flips sign at the short and not at the open end: the origin of reflections you see on a scope.', set: { init: 'pulse', p: 0.5, bc: 'fx', L: 1, c: 2e8, what: 'cable' } },
  { tag: 'Biology', title: 'Ultrasound echo ranging', note: '10 cm of tissue, c = 1540 m/s. The echo returns after 2L/c ≈ 130 µs; depth = c·t/2 is how scanners build an image.', set: { init: 'pulse', p: 0.15, bc: 'xx', L: 0.1, c: 1540, what: 'tissue' } },
  { tag: 'Aerospace', title: 'Steel rod, free ends (vibration test)', note: 'L = 1 m, longitudinal wave speed ≈ 5000 m/s: f₁ = c/2L = 2.5 kHz. A free–free beam is how modal tests of airframe parts are set up.', set: { init: 'pulse', p: 0.5, bc: 'xx', L: 1, c: 5000, what: 'rod' } },
];
export default function Wave() {
  const [kind, setKind] = useState('pluck'), [p, setP] = useState(0.3), [bc, setBc] = useState('ff'), [sc, setSc] = useState(0.95), [fi, setFi] = useState(0), [play, setPlay] = useState(true);
  const [L, setL] = useState(0.648), [c, setC] = useState(427), [what, setWhat] = useState('string'), [cur, setCur] = useState('');
  const init = useMemo(() => (kind === 'pluck' ? E.waveInit.pluck(NX, p) : E.waveInit.pulse(NX, p, 0.04)), [kind, p]);
  const sim = useMemo(() => E.wave1d({ init, s: sc, bc, tEnd: 6, rows: 300 }), [init, sc, bc]);
  useEffect(() => { if (!play) return; const id = setInterval(() => setFi((f) => (f + 1) % sim.frames.length), 33); return () => clearInterval(id); }, [play, sim]);
  const f = Math.min(fi, sim.frames.length - 1), cur_u = sim.frames[f], tNow = sim.times[f];
  const xs = (u) => Array.from(u, (v, i) => [i / (NX - 1), v]);
  const flat = useMemo(() => { const a = new Float32Array(NX * sim.frames.length); sim.frames.forEach((fr, j) => a.set(fr, j * NX)); return a; }, [sim]);
  const co = bc === 'ff' && kind === 'pluck' ? E.sineCoeffs(init, 8) : null, mx = co ? Math.max(...co.map(Math.abs)) : 1;
  const f1 = E.modeFreq(bc, 1, c, L), tau = L / c;
  const load = (q) => { const t = q.set; setKind(t.init); setP(t.p); setBc(t.bc); setL(t.L); setC(t.c); setWhat(t.what); setCur(q.title); setFi(0); };
  const yr = Math.max(1.2, Math.min(5, ...[Math.max(...cur_u.map(Math.abs)) * 1.1]));
  return (
    <div>
      <Fund n={4} name="The wave equation" eq={'∂²u/∂t² = c² ∂²u/∂x²'} words="Acceleration of each point is proportional to the curvature of the profile around it: a bent string is pulled back, and that pull makes the disturbance travel. The speed is c = √(tension/density) for a string, √(E/ρ) for a rod, 1/√(με) for light." type="Second-order, linear, hyperbolic PDE: second derivative in both time and space." needs="Initial shape u(x,0) and initial velocity ∂u/∂t(x,0), plus boundary conditions at the ends (fixed, free, or open/short in a circuit)." solution="d’Alembert: u = f(x − ct) + g(x + ct), two pulses moving at ±c. With ends: standing modes sin(nπx/L) cos(nπct/L), a Fourier series. Numerically: leapfrog in time, stable only if cΔt/Δx ≤ 1 (the CFL condition)." />
      <div className="grid">
        <div>
          <Panel title="Set up the medium">
            <div className="row"><button className={'btn' + (kind === 'pluck' ? ' on' : '')} onClick={() => setKind('pluck')}>Pluck (triangle)</button><button className={'btn' + (kind === 'pulse' ? ' on' : '')} onClick={() => setKind('pulse')}>Pulse (bump)</button></div>
            <div className="row" style={{ margin: '8px 0' }}>Ends:{Object.entries(BCS).map(([k, l]) => <button key={k} className={'btn' + (bc === k ? ' on' : '')} onClick={() => setBc(k)}>{l}</button>)}</div>
            <Slider label="start position" value={p} min={0.1} max={0.5} step={0.01} onChange={setP} fmt={(v) => v.toFixed(2) + ' L'} />
            <Slider label="CFL number cΔt/Δx" value={sc} min={0.3} max={1.1} step={0.01} onChange={setSc} fmt={(v) => v.toFixed(2)} />
            {sc > 1 && <Warn>CFL number &gt; 1: the numerical wave outruns the physical information. The scheme is <b>unstable</b> and blows up.</Warn>}
            <div className="row" style={{ margin: '6px 0' }}><button className="btn" onClick={() => setPlay(!play)}>{play ? 'Pause' : 'Play'}</button></div>
            <Slider label="time" value={f} min={0} max={sim.frames.length - 1} step={1} onChange={(v) => { setPlay(false); setFi(v); }} fmt={() => 't = ' + tNow.toFixed(2) + ' L/c'} />
            <div className="kv" style={{ marginTop: 8 }}><Cell k={`LOWEST FREQ f₁ (${what})`} v={sci(f1) + ' Hz'} /><Cell k="TRAVEL TIME L/c" v={fmtT(tau)} /><Cell k="ECHO TIME 2L/c" v={fmtT(2 * tau)} /><Cell k="SECOND MODE" v={sci(E.modeFreq(bc, 2, c, L)) + ' Hz'} /></div>
            <p className="note">Frequencies of the modes: {bc === 'fx' ? 'fₙ = (2n−1)c/4L: only odd multiples' : 'fₙ = n c/2L: all multiples'}. At a <b>fixed</b> end a pulse comes back upside-down; at a <b>free</b> end it comes back the right way up.</p>
          </Panel>
          <Apps items={PRE.map((q) => ({ ...q, run: () => load(q) }))} current={cur} />
          {co && <Panel title="Harmonic content of the pluck (Fourier sine coefficients)"><div className="bars">{co.map((a, n) => <div className="bar" key={n}><span>n = {n + 1}</span><div><i style={{ width: `${(Math.abs(a) / mx) * 100}%` }} /></div><span>{sci(f1 * (n + 1))} Hz</span></div>)}</div><p className="note">aₙ ∝ sin(nπp)/n². Pluck at the middle (p = 0.5) and all even harmonics vanish; pluck at p = 0.2 and the 5th disappears.</p></Panel>}
          <Links items={[['newton', 'Newton', 'A string is N masses on springs; each obeys F = ma. Let N → ∞ and you get this PDE (see Common Thread).'], ['maxwell', 'Maxwell', 'Faraday + Ampère–Maxwell combine into exactly this equation with c = 1/√(μ₀ε₀).'], ['schrodinger', 'Schrödinger', 'Also a wave equation, but first-order in time with an i: the waves disperse (spread out).']]} />
          <Check q="Why does pressing a guitar string at the 12th fret raise the pitch by one octave?" a="Halving L doubles f₁ = c/2L. Same tension and mass per length means the same c, so frequency goes up exactly twice." />
          <Check q="A pulse hits a free end and a fixed end. What is different about the reflection, and where have you seen the electrical version?" a="Fixed end: reflected pulse inverted (reflection coefficient −1). Free end: same sign (+1). In a cable, a short circuit inverts and an open circuit does not; a matched load reflects nothing." />
          <Caveat>one dimension, no damping, constant medium. Real strings lose energy and are slightly stiff, so their upper harmonics are a little sharp.</Caveat>
        </div>
        <div>
          <Stage title={`Displacement u(x) of the ${what}`} legend={<><span className="t">● now</span><span className="p">- - start</span></>}>
            <Plot series={[{ pts: xs(init), color: '#b98ad0', dash: '5 4', w: 1.5 }, { pts: xs(cur_u), color: '#4fd6bd', w: 3 }]} xr={[0, 1]} yr={[-yr, yr]} xl="position x / L" yl="displacement" xfmt={(v) => v.toFixed(1)} yfmt={(v) => v.toFixed(1)} h={270} />
          </Stage>
          <Stage title="Space–time picture: the disturbance travels in straight lines" legend={<><span className="o">■ positive</span><span style={{ color: '#6aa8ff' }}>■ negative</span></>}>
            <Canvas2D nx={NX} ny={sim.frames.length} values={flat} vmin={-1.1} vmax={1.1} cmap="div" scaleX={3} scaleY={1.1} label="Space-time plot of the wave" overlay={(ctx, sx, sy) => { ctx.strokeStyle = '#f0a43a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, f * sy); ctx.lineTo(NX * sx, f * sy); ctx.stroke(); }} />
            <p className="note">Horizontal axis: position. Vertical: time (downwards). Lines of slope ±c are the d’Alembert pulses f(x − ct) and g(x + ct). Reflections at the ends turn them back; where they overlap they add (superposition).</p>
          </Stage>
        </div>
      </div>
      <Bridge rows={[['u = f(x − ct)', 'A shape moving at speed c without changing form: the travelling-wave solution.'], ['Σ aₙ sin(nπx/L) cos(ωₙt)', 'Standing waves = Fourier series; the harmonics are the eigenvalues of d²/dx².'], ['boundary conditions', 'Fixed, free, open, short: each end decides the sign of the reflection.'], ['CFL: cΔt/Δx ≤ 1', 'Numerical stability: information cannot travel more than one cell per step.'], ['f = c/λ', 'The relation between speed, frequency and wavelength in every wave application.']]} />
    </div>
  );
}
