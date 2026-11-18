import { useEffect, useRef, useState } from 'react';
import * as E from '../lib/engines.js';
import { Panel, Stage, Slider, Cell, Bridge, Check, Plot, Caveat, Fund, Apps, Links, Warn, sci } from '../ui.jsx';

const N = 2048, L = 240;
const PRE = [
  { tag: 'EE', title: 'Tunnelling through a thin oxide', note: 'Electron packet meets a barrier higher than its energy: part of the wave gets through. Units ħ = m = 1: for an electron, 1 length = 1 nm and 1 energy = 0.076 eV.', set: { scn: 'barrier', k0: 2, V0: 3.5, w: 1.2 } },
  { tag: 'Biology', title: 'Hydrogen tunnelling in an enzyme', note: 'Transfer of H through a barrier is measurably faster than classical hopping; heavier deuterium (larger mass → larger κ) tunnels less. Raise V₀ or w to mimic a heavier particle.', set: { scn: 'barrier', k0: 1.8, V0: 4, w: 0.9 } },
  { tag: 'Mechanical', title: 'Vibrating bond / quantum resonator', note: 'A displaced packet in a harmonic well swings back and forth exactly like the classical mass-spring: Ehrenfest’s theorem.', set: { scn: 'harmonic', om: 0.5 } },
  { tag: 'ECE', title: 'Wave packet spreading in free space', note: 'A narrow packet is a broad mix of wavelengths, and each moves at its own speed, so it spreads: the limit on how well you can confine and guide a wave.', set: { scn: 'free', k0: 2, sg: 3 } },
  { tag: 'CSE', title: 'Finding a ground state in imaginary time', note: 'Replace t by −iτ: components with higher energy decay faster and the state relaxes to the ground state. The same idea runs in quantum Monte Carlo and optimisation.', set: { scn: 'imag', om: 0.5 } },
];
const mk = (p) => {
  if (p.scn === 'barrier') return new E.TDSE({ N, L, V: E.barrier(p.V0, p.w), dt: 0.02, x0: -45, sigma: p.sb, k0: p.k0 });
  if (p.scn === 'harmonic') return new E.TDSE({ N, L, V: E.harmonic(p.om), dt: 0.02, x0: -12, sigma: Math.sqrt(1 / (2 * p.om)), k0: 0 });
  if (p.scn === 'imag') return new E.TDSE({ N, L, V: E.harmonic(p.om), dt: 0.02, x0: 18, sigma: 4, k0: 0 });
  return new E.TDSE({ N, L, V: () => 0, dt: 0.02, x0: -45, sigma: p.sg, k0: p.k0 });
};
export default function Schrodinger() {
  const [p, setP] = useState({ scn: 'barrier', k0: 2, V0: 3.5, w: 1.2, om: 0.5, sg: 3, sb: 9 }), [play, setPlay] = useState(true), [, setTick] = useState(0), [cur, setCur] = useState('');
  const sim = useRef(null), hist = useRef([]), ymaxRef = useRef(0.1), raf = useRef(0);
  const reset = () => { sim.current = mk(p); hist.current = []; ymaxRef.current = Math.max(...Array.from({ length: N }, (_, i) => sim.current.prob(i))) * 1.25; setTick((t) => t + 1); };
  useEffect(reset, [p.scn, p.k0, p.V0, p.w, p.om, p.sg, p.sb]);
  useEffect(() => { let alive = true; const loop = () => { if (!alive) return; const s = sim.current; if (play && s) { const imag = p.scn === 'imag', stop = (p.scn === 'barrier' || p.scn === 'free') ? s.meanX() > 88 || s.t > 150 : imag ? s.t > 40 : s.t > 200; if (!stop) { s.run(3, imag); const w = E.effWidth(s); hist.current.push([s.t, s.widthX(), s.meanX(), s.probIn(w / 2 + 0.2, L / 2), s.energy()]); if (hist.current.length > 1200) hist.current.shift(); setTick((t) => t + 1); } } raf.current = requestAnimationFrame(loop); }; raf.current = requestAnimationFrame(loop); return () => { alive = false; cancelAnimationFrame(raf.current); }; }, [play, p.scn]);
  const s = sim.current; if (!s) return null;
  const set = (k) => (v) => setP({ ...p, [k]: v }), H = hist.current, t = s.t;
  const step = 2, pts = [], re = [], vp = []; let pmax = 1e-9; for (let i = 0; i < N; i++) pmax = Math.max(pmax, s.prob(i));
  const wide = p.scn === 'barrier' || p.scn === 'free', ym = Math.max(ymaxRef.current, pmax * 1.15), lo = wide ? -100 : -45, hi = wide ? 100 : 45, vref = p.scn === 'barrier' ? p.V0 : 1;
  for (let i = 0; i < N; i += step) { const x = s.x[i]; if (x < lo || x > hi) continue; pts.push([x, s.prob(i)]); re.push([x, (s.re[i] * ym * 0.5) / Math.sqrt(pmax)]); vp.push([x, Math.min(ym, p.scn === 'barrier' ? (s.V[i] / vref) * ym * 0.7 : (s.V[i] / (0.5 * p.om * p.om * 40 * 40)) * ym * 0.9)]); }
  const wEff = E.effWidth(s), kmom = s.momentum(), E0 = 0.5 * p.k0 * p.k0, Tpw = E.tunnelT(E0, p.V0, wEff), Tsim = s.probIn(wEff / 2 + 0.2, L / 2);
  const free = p.scn === 'free', har = p.scn === 'harmonic', imag = p.scn === 'imag', bar = p.scn === 'barrier';
  const hs = { series: [], yr: [0, 1], yl: '', xl: 'time t', note: '' };
  if (bar) { hs.series = [{ pts: H.map((h) => [h[0], h[3]]), color: '#4fd6bd' }, { pts: [[0, Tpw], [Math.max(10, t), Tpw]], color: '#f0a43a', dash: '5 4', w: 1.6 }]; hs.yr = [0, Math.max(0.1, Math.min(1, Math.max(Tpw, Tsim) * 1.4))]; hs.yl = 'probability beyond barrier'; hs.note = 'Teal: probability found beyond the barrier. Dashed: plane-wave formula T = [1 + V₀² sinh²(κw)/(4E(V₀−E))]⁻¹ at the mean energy. A packet holds a spread of energies and T rises steeply with E, so the packet’s T is usually a little higher. Make the packet wider (narrower in k) and the two lines converge.'; }
  if (har) { const x0 = -12; hs.series = [{ pts: H.map((h) => [h[0], h[2]]), color: '#4fd6bd' }, { pts: Array.from({ length: 121 }, (_, i) => { const tt = (i / 120) * Math.max(10, t); return [tt, x0 * Math.cos(p.om * tt)]; }), color: '#f0a43a', dash: '5 4', w: 1.6 }]; hs.yr = [-14, 14]; hs.yl = 'average position ⟨x⟩'; hs.note = 'Teal: quantum ⟨x⟩ from Schrödinger. Dashed: classical x₀cos(ωt) from Newton’s law. They coincide for a harmonic potential (Ehrenfest).'; }
  if (free) { const sg = p.sg; hs.series = [{ pts: H.map((h) => [h[0], h[1]]), color: '#4fd6bd' }, { pts: Array.from({ length: 121 }, (_, i) => { const tt = (i / 120) * Math.max(10, t); return [tt, sg * Math.sqrt(1 + (tt / (2 * sg * sg)) ** 2)]; }), color: '#f0a43a', dash: '5 4', w: 1.6 }]; hs.yr = [0, Math.max(6, (H.length ? H[H.length - 1][1] : 3) * 1.3)]; hs.yl = 'width σₓ'; hs.note = 'Teal: simulated width. Dashed: σ√(1 + (t/2σ²)²) for ħ = m = 1. Narrower packets spread faster.'; }
  if (imag) { hs.series = [{ pts: H.map((h) => [h[0], h[4]]), color: '#4fd6bd' }, { pts: [[0, p.om / 2], [Math.max(10, t), p.om / 2]], color: '#f0a43a', dash: '5 4', w: 1.6 }]; hs.yr = [0, Math.max(1, (H.length ? H[0][4] : 1) * 1.05)]; hs.yl = 'energy ⟨E⟩'; hs.xl = 'imaginary time τ'; hs.note = 'Teal: ⟨E⟩ falling as the state relaxes. Dashed: the exact ground-state energy ħω/2. Same decay-to-the-lowest-mode idea as heat flow.'; }
  const load = (q) => { setP({ ...p, ...q.set }); setCur(q.title); setPlay(true); };
  return (
    <div>
      <Fund n={7} name="The Schrödinger equation" eq={'iħ ∂ψ/∂t = −(ħ²/2m) ∂²ψ/∂x² + V(x) ψ'} words="The state of a particle is a complex wave ψ(x,t). |ψ|² is the probability of finding it at x. The right-hand side is the energy operator: kinetic term (curvature of ψ) plus potential. The factor i makes ψ rotate in the complex plane instead of decaying." type="Second-order in space, first-order in time, linear PDE with complex values. A wave equation with an ‘i’; formally the heat equation in imaginary time." needs="Initial wave function ψ(x,0), potential V(x), and boundary conditions. The state is a normalised vector: ∫|ψ|²dx = 1." solution="Stationary states: ψ = φₙ(x) e^(−iEₙt/ħ), with φₙ the eigenfunctions of the energy operator and Eₙ its eigenvalues. Numerically: split-step Fourier (kinetic step in k-space, potential step in x-space), which preserves the norm exactly." />
      <div className="grid">
        <div>
          <Panel title="Choose the quantum situation">
            <div className="row" style={{ marginBottom: 8 }}>{[['barrier', 'Barrier (tunnelling)'], ['harmonic', 'Spring well'], ['free', 'Free packet'], ['imag', 'Imaginary time']].map(([k, l]) => <button key={k} className={'btn' + (p.scn === k ? ' on' : '')} onClick={() => setP({ ...p, scn: k })}>{l}</button>)}</div>
            {(bar || free) && <Slider label="momentum k₀" value={p.k0} min={0.5} max={4} step={0.05} onChange={set('k0')} fmt={(v) => v.toFixed(2) + `  (E = ${(0.5 * v * v).toFixed(2)})`} />}
            {bar && <><Slider label="barrier height V₀" value={p.V0} min={0.5} max={8} step={0.1} onChange={set('V0')} fmt={(v) => v.toFixed(1)} /><Slider label="barrier width w" value={p.w} min={0.3} max={4} step={0.1} onChange={set('w')} fmt={(v) => v.toFixed(1)} /><Slider label="packet width σ" value={p.sb} min={4} max={11} step={0.5} onChange={set('sb')} fmt={(v) => v.toFixed(1)} /></>}
            {(har || imag) && <Slider label="spring ω" value={p.om} min={0.2} max={1} step={0.02} onChange={set('om')} fmt={(v) => v.toFixed(2)} />}
            {free && <Slider label="packet width σ" value={p.sg} min={1.5} max={8} step={0.1} onChange={set('sg')} fmt={(v) => v.toFixed(1)} />}
            <div className="row" style={{ margin: '6px 0' }}><button className="btn" onClick={() => setPlay(!play)}>{play ? 'Pause' : 'Run'}</button><button className="btn" onClick={reset}>Restart</button></div>
            {bar && p.k0 * p.k0 / 2 > p.V0 && <Warn>E = {(0.5 * p.k0 ** 2).toFixed(2)} is above V₀ = {p.V0}: classically the particle just goes over. Quantum mechanics still reflects part of it.</Warn>}
            <div className="kv"><Cell k="TIME" v={t.toFixed(1)} /><Cell k="NORM ∫|ψ|²dx" v={s.norm().toFixed(5)} /><Cell k="⟨x⟩" v={s.meanX().toFixed(2)} /><Cell k="⟨k⟩ (momentum)" v={kmom.k.toFixed(2)} /><Cell k="ENERGY ⟨E⟩" v={s.energy().toFixed(3)} />{bar ? <Cell k="T simulated · plane-wave" v={`${Tsim.toFixed(3)} · ${Tpw.toFixed(3)}`} /> : <Cell k="WIDTH σₓ" v={s.widthX().toFixed(2)} />}</div>
            <p className="note">Norm stays 1: the evolution is unitary (the same property as the gates in the quantum project). Units: ħ = m = 1.</p>
          </Panel>
          <Apps items={PRE.map((q) => ({ ...q, run: () => load(q) }))} current={cur} />
          <Links items={[['newton', 'Newton', 'In the spring well the average position follows x₀cos(ωt) exactly: Newton’s law emerges from the average behaviour.'], ['heat', 'Heat', 'In imaginary time the equation is a diffusion equation; the lowest-energy mode survives.'], ['wave', 'Wave', 'Same structure, but ω ∝ k² instead of ω = ck: different speeds for different wavelengths, so packets spread.'], ['expo', 'Exponential', 'Each stationary state carries the pure phase e^(−iEt/ħ); tunnelling is e^(−κx) inside the barrier.']]} />
          <Check q="Why is the transmission not zero when the particle energy is below the barrier height?" a="Inside the barrier ψ″ = κ²ψ has real exponential solutions, so ψ decays but is not zero. If the barrier is thin, the decaying wave still has a small amplitude on the far side, and that amplitude carries probability T ≈ e^(−2κw)." />
          <Check q="A narrow wave packet spreads faster than a wide one. Why?" a="A narrow packet is built from a wide range of wavenumbers (Fourier), and since ω = ħk²/2m each component moves at a different speed. Wider spread of k means faster dispersion: σ(t) = σ√(1 + (ħt/2mσ²)²)." />
          <Caveat>one dimension, ħ = m = 1, a Gaussian packet and a few textbook potentials. Real devices are 3D and many-particle. The mathematics of the 1D problem is exactly what the 3D one reduces to along each direction.</Caveat>
        </div>
        <div>
          <Stage title="Probability density |ψ|² (teal), real part of ψ (orange), potential (grey)" legend={<><span className="t">● |ψ|²</span><span className="o">● Re ψ</span><span style={{ color: '#8a949e' }}>▬ V(x)</span></>}>
            <Plot series={[{ pts: vp, color: '#566170', w: 2 }, { pts: re, color: '#f0a43a', w: 1.2 }, { pts: pts, color: '#4fd6bd', w: 3 }]} xr={[lo, hi]} yr={[-ym * 0.55, ym]} xl="position x" yl="|ψ|²" xfmt={(v) => v.toFixed(0)} yfmt={(v) => (v < 0 ? '' : v.toFixed(2))} h={330} xticks={wide ? [-100, -50, 0, 50, 100] : [-40, -20, 0, 20, 40]} bands={bar ? [[-p.w / 2, p.w / 2, 'rgba(240,164,58,.12)']] : []} />
            <p className="note">The orange wiggle is the <b>complex phase</b> e^(ikx) seen through its real part: the wavelength is 2π/k. |ψ|² is what a detector would find. Press Restart after changing parameters.</p>
          </Stage>
          <Stage title="History"><Plot series={hs.series} xr={[0, Math.max(10, t)]} yr={hs.yr} xl={hs.xl} yl={hs.yl} xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(2)} h={230} /><p className="note">{hs.note}</p></Stage>
        </div>
      </div>
      <Bridge rows={[['complex ψ', 'Amplitude and phase from the Complex Numbers lesson; |ψ|² gives probabilities.'], ['−ħ²/2m ∂²/∂x² + V', 'An operator: the same as a matrix, acting on a function. Its eigenvalues are the allowed energies.'], ['e^(−iEt/ħ)', 'Pure rotation in the complex plane: time evolution of an energy eigenstate.'], ['FFT', 'Fourier transform turns the second derivative into multiplication by −k²: the numerical trick used here.'], ['unitary U†U = I', 'Probability is conserved: ∫|ψ|² stays 1 (norm printed above).']]} />
    </div>
  );
}
