import { useMemo, useState } from 'react';
import * as E from '../lib/engines.js';
import { Panel, Stage, Slider, Cell, Bridge, Check, Plot, Caveat, Fund, Apps, Links, Warn, fmtT, sci } from '../ui.jsx';

const NX = 81;
const SCN = {
  spot: { label: 'Hot spot, ends held cold', init: () => E.heatInit.gauss(NX), bc: 'dirichlet', left: 0, right: 0 },
  half: { label: 'Insulated rod, hot half', init: () => E.heatInit.step(NX), bc: 'neumann', left: 0, right: 0 },
  ends: { label: 'One end heated, other cold', init: () => E.heatInit.cold(NX), bc: 'dirichlet', left: 1, right: 0 },
  mode: { label: 'Single sine mode', init: () => E.heatInit.sine(NX, 1), bc: 'dirichlet', left: 0, right: 0 },
  noise: { label: 'Noisy signal (smoothing)', init: () => E.heatInit.noisy(NX), bc: 'neumann', left: 0, right: 0 },
};
const PRE = [
  { tag: 'Civil', title: 'Mass-concrete wall, 0.5 m', note: 'α ≈ 0.7×10⁻⁶ m²/s: the core of a thick pour stays hot for days, which can crack the concrete.', set: { scn: 'half', L: 0.5, alpha: 7e-7, what: 'concrete wall' } },
  { tag: 'ECE', title: 'Copper heat-spreader, 5 cm', note: 'α ≈ 1.1×10⁻⁴ m²/s: copper equalises temperature in about 20 seconds. Metal heat sinks use this.', set: { scn: 'ends', L: 0.05, alpha: 1.1e-4, what: 'copper bar' } },
  { tag: 'Mechanical', title: 'Steel brake disc, 2 cm', note: 'α ≈ 1.2×10⁻⁵ m²/s: heat from braking soaks through the disc in about half a minute.', set: { scn: 'spot', L: 0.02, alpha: 1.2e-5, what: 'steel disc' } },
  { tag: 'Biology', title: 'Hyperthermia of tissue, 5 mm', note: 'α ≈ 1.4×10⁻⁷ m²/s: tissue conducts heat slowly, so a heated spot stays local for minutes.', set: { scn: 'spot', L: 0.005, alpha: 1.4e-7, what: 'tissue' } },
  { tag: 'Aerospace', title: 'Insulating tile, 5 cm', note: 'α ≈ 5×10⁻⁷ m²/s (illustrative): a thick low-diffusivity layer delays heat for over an hour. Reentry tiles work this way.', set: { scn: 'ends', L: 0.05, alpha: 5e-7, what: 'insulation tile' } },
  { tag: 'CSE', title: 'Gaussian blur / denoising', note: 'Blurring a signal for “time” θ is exactly heat flow; the blur width is σ = √(2θ)·L. Diffusion models in AI run this idea in reverse.', set: { scn: 'noise', L: 1, alpha: 1, what: 'signal' } },
];
export default function Heat() {
  const [scn, setScn] = useState('spot'), [s, setS] = useState(0.45), [r, setR] = useState(0.4), [L, setL] = useState(0.5), [alpha, setAlpha] = useState(7e-7), [what, setWhat] = useState('concrete wall'), [cur, setCur] = useState('');
  const theta = 0.5 * s * s, S = SCN[scn];
  const init = useMemo(() => S.init(), [scn]);
  const now = useMemo(() => E.heat1d({ init, theta, r, bc: S.bc, left: S.left, right: S.right }), [scn, theta, r]);
  const snaps = useMemo(() => [0.25, 0.5].map((f) => E.heat1d({ init, theta: theta * f, r, bc: S.bc, left: S.left, right: S.right }).u), [scn, theta, r]);
  const probe = useMemo(() => Array.from({ length: 41 }, (_, i) => { const th = (i / 40) * 0.3, o = E.heat1d({ init, theta: th, r: 0.4, bc: S.bc, left: S.left, right: S.right }); return [th, o.u[NX >> 1]]; }), [scn]);
  const tau = (L * L) / alpha, xs = (u) => Array.from(u, (v, i) => [i / (NX - 1), v]);
  const ymax = scn === 'noise' ? 1.5 : 1.05, ymin = scn === 'noise' ? -0.3 : scn === 'mode' || scn === 'spot' ? -0.05 : -0.05;
  const load = (p) => { const q = p.set; setScn(q.scn); setL(q.L); setAlpha(q.alpha); setWhat(q.what); setCur(p.title); setS(0.45); };
  return (
    <div>
      <Fund n={3} name="The heat (diffusion) equation" eq={'∂u/∂t = α ∂²u/∂x²'} words="Heat flows from hot to cold at a rate proportional to the temperature gradient (Fourier’s law), and energy is conserved. Combine the two and you get this: the change at a point is proportional to how far it is from the average of its neighbours." type="Second-order, linear, parabolic partial differential equation (PDE): first derivative in time, second in space." needs="An initial profile u(x,0) and boundary conditions at each end (fixed temperature = Dirichlet, or insulated = Neumann)." solution="Separate variables: u = Σ aₙ sin(nπx/L) e^(−αn²π²t/L²). Each Fourier mode decays exponentially, high modes fastest. Numerically: step in time with finite differences." />
      <div className="grid">
        <div>
          <Panel title="Set up the rod">
            <div className="row" style={{ marginBottom: 8 }}>{Object.entries(SCN).map(([k, v]) => <button key={k} className={'btn' + (scn === k ? ' on' : '')} onClick={() => setScn(k)}>{v.label}</button>)}</div>
            <Slider label="time θ = αt/L²" value={s} min={0} max={1} step={0.005} onChange={setS} fmt={() => theta.toFixed(4)} />
            <Slider label="numerical r = αΔt/Δx²" value={r} min={0.1} max={0.62} step={0.01} onChange={setR} fmt={(v) => v.toFixed(2)} />
            {r > 0.5 && <Warn>r = {r.toFixed(2)} &gt; ½: <b>unstable</b>. The update multiplies the sharpest mode by (1 − 4r) = {(1 - 4 * r).toFixed(2)}, which is below −1, so errors double every step. Stability is an eigenvalue condition on the update matrix.</Warn>}
            {now.unstable && r <= 0.5 && <Warn>Numerical blow-up.</Warn>}
            <div className="kv"><Cell k="DIFFUSION TIME τ = L²/α" v={fmtT(tau)} /><Cell k="REAL TIME AT θ" v={fmtT(theta * tau)} /><Cell k="HEAT REACHES √(αt)" v={sci(Math.sqrt(alpha * theta * tau), 2) + ' m'} /><Cell k="BLUR WIDTH √(2θ)·L" v={sci(Math.sqrt(2 * theta) * L, 2) + ' m'} /></div>
            <p className="note">{what}: L = {sci(L)} m, α = {sci(alpha)} m²/s. Rule of thumb: <b>time to equalise ≈ L²/α</b>, so doubling the thickness takes four times as long.</p>
          </Panel>
          <Apps items={PRE.map((p) => ({ ...p, run: () => load(p) }))} current={cur} />
          <Links items={[['expo', 'Exponential', 'Each Fourier mode of the rod decays as e^(−αn²π²t/L²).'], ['laplace', 'Laplace', 'Steady state (∂u/∂t = 0) is Laplace’s equation. A Jacobi sweep in that tab is one heat step with r = ¼.'], ['schrodinger', 'Schrödinger', 'Replace t by −iτ in Schrödinger’s equation and you get a heat equation (imaginary time).']]} />
          <Check q="A 10 cm concrete slab takes about a day to even out its temperature. How long for a 20 cm slab?" a="Time scales as L²/α: doubling L gives four times the time, about 4 days. This is why mass concrete needs cooling pipes." />
          <Check q="Why does a sharp peak smooth out faster than a gentle bump?" a="A sharp feature is made of high-wavenumber Fourier modes, which decay as e^(−αk²t): quadratically faster in k. Smoothing is the heat equation removing high frequencies first." />
          <Caveat>one dimension, constant α, no heat generation. The numerical scheme is the simple explicit one, chosen because it shows the stability limit r ≤ ½ clearly.</Caveat>
        </div>
        <div>
          <Stage title={`Temperature along the ${what}`} legend={<><span className="t">● now</span><span className="o">● earlier</span><span className="p">- - start</span></>}>
            <Plot series={[{ pts: xs(init), color: '#b98ad0', dash: '5 4', w: 1.5 }, { pts: xs(snaps[0]), color: '#f0a43a', w: 1.5 }, { pts: xs(snaps[1]), color: '#f0a43a', w: 1.5 }, { pts: xs(now.u), color: '#4fd6bd', w: 3 }]} xr={[0, 1]} yr={[ymin, ymax]} xl="position x / L" yl="temperature (scaled)" xfmt={(v) => v.toFixed(1)} yfmt={(v) => v.toFixed(1)} h={330} />
          </Stage>
          <Stage title="Temperature at the middle versus time" legend={scn === 'mode' ? <><span className="t">● simulation</span><span className="o">- - e^(−π²θ)</span></> : <span className="t">● simulation</span>}>
            <Plot series={[{ pts: probe, color: '#4fd6bd' }, ...(scn === 'mode' ? [{ pts: probe.map(([t]) => [t, Math.exp(-Math.PI * Math.PI * t)]), color: '#f0a43a', dash: '5 4', w: 1.8 }] : [])]} xr={[0, 0.3]} yr={[Math.min(0, ...probe.map((p) => p[1])) - 0.05, Math.max(1.05, ...probe.map((p) => p[1]))]} xl="time θ = αt/L²" yl="u at x = L/2" mark={theta} xfmt={(v) => v.toFixed(2)} yfmt={(v) => v.toFixed(1)} h={220} />
            {scn === 'mode' && <p className="note">Dashed: the exact mode decay e^(−π²θ). The simulation lies on top of it: the numerical solver and the Fourier solution agree.</p>}
          </Stage>
        </div>
      </div>
      <Bridge rows={[['∂²u/∂x²', 'Curvature. Where the profile bends upward the temperature rises; where it bends down it falls.'], ['Fourier series', 'Any profile = sum of sine modes; each decays separately (separation of variables).'], ['e^(−αk²t)', 'Decay rate grows as k²: sharp features vanish first.'], ['eigenvalues of the update matrix', 'Explicit scheme is stable only if all eigenvalues lie in [−1, 1]: r ≤ ½.'], ['t ≈ L²/α', 'The scaling law engineers use for every conduction problem.']]} />
    </div>
  );
}
