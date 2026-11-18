import { useMemo, useState } from 'react';
import * as E from '../lib/engines.js';
import { Panel, Stage, Slider, Cell, Bridge, Check, Caveat, Fund, Apps, Links, Canvas2D } from '../ui.jsx';

const NX = 64, NY = 48;
function build(scn, rho) {
  const type = new Uint8Array(NX * NY), val = new Float64Array(NX * NY), src = new Float64Array(NX * NY), set = (i, j, t, v) => { if (i >= 0 && i < NX && j >= 0 && j < NY) { type[j * NX + i] = t; val[j * NX + i] = v; } };
  const ring = (v) => { for (let i = 0; i < NX; i++) { set(i, 0, 1, v); set(i, NY - 1, 1, v); } for (let j = 0; j < NY; j++) { set(0, j, 1, v); set(NX - 1, j, 1, v); } };
  const blob = (ci, cj, a) => { for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) src[j * NX + i] = a * Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) / (2 * 16)); };
  if (scn === 'cap') { ring(0); for (let i = 14; i <= 49; i++) { set(i, 15, 1, 1); set(i, 32, 1, -1); } blob(32, 24, rho); }
  if (scn === 'tip') { for (let i = 0; i < NX; i++) { set(i, 0, 1, 1); set(i, NY - 1, 1, 0); } for (let j = 0; j <= 18; j++) { const hw = j < 10 ? 1 : j < 15 ? 0 : -1; if (hw >= 0) for (let i = 32 - hw; i <= 32 + hw; i++) set(i, j, 1, 1); } }
  if (scn === 'plate') { ring(0); for (let j = 0; j < NY; j++) set(0, j, 1, 1); blob(40, 24, rho); }
  if (scn === 'dam') { for (let i = 0; i < NX; i++) { if (i < 22) set(i, 0, 1, 1); else if (i > 42) set(i, 0, 1, 0); } for (let j = 0; j <= 24; j++) set(32, j, 2, 0); }
  return { type, val, src };
}
const SC = {
  cap: { label: 'Capacitor plates', cmap: 'div', lo: -1, hi: 1, unit: 'potential (V)' },
  tip: { label: 'Needle over a plane', cmap: 'seq', lo: 0, hi: 1, unit: 'potential (V)' },
  plate: { label: 'Heated plate', cmap: 'seq', lo: 0, hi: 1, unit: 'temperature (scaled)' },
  dam: { label: 'Seepage under a dam', cmap: 'seq', lo: 0, hi: 1, unit: 'water head (scaled)' },
};
const PRE = [
  { tag: 'ECE', title: 'Parallel-plate capacitor', note: 'Field between the plates is uniform; at the edges it fringes and leaks out. Add charge between the plates and the potential bulges (Poisson).', set: { scn: 'cap' } },
  { tag: 'EE', title: 'Sharp tip: lightning rod, corona, breakdown', note: 'The field concentrates at the tip, many times above the average. That is why lightning rods work and why sharp edges spark.', set: { scn: 'tip' } },
  { tag: 'Biology', title: 'Needle electrode in tissue', note: 'Same maths: the stimulating current density peaks right at a thin electrode tip, which is why small electrodes activate nerves locally.', set: { scn: 'tip' } },
  { tag: 'Mechanical', title: 'Steady heat in a plate with a hot spot', note: 'Left edge held hot, others cold, with Joule heating (source) in the middle: the steady temperature map of a heated component.', set: { scn: 'plate', rho: 0.6 } },
  { tag: 'Civil', title: 'Seepage under a dam with a cut-off wall', note: 'Head is high upstream, low downstream. The sheet pile (wall) forces water to flow around it: flow lines are −∇h, a “flow net”.', set: { scn: 'dam' } },
];
export default function Laplace() {
  const [scn, setScn] = useState('cap'), [method, setMethod] = useState('sor'), [li, setLi] = useState(3.2), [rho, setRho] = useState(0), [cur, setCur] = useState('Parallel-plate capacitor');
  const iters = Math.round(10 ** li) - 1, S = SC[scn], useRho = scn === 'cap' || scn === 'plate';
  const g = useMemo(() => build(scn, useRho ? rho : 0), [scn, rho]);
  const run = useMemo(() => E.laplace2d({ nx: NX, ny: NY, type: g.type, val: g.val, rho: g.src, method, maxIter: iters, tol: 0 }), [g, method, iters]);
  const conv = useMemo(() => Object.fromEntries(['jacobi', 'gs', 'sor'].map((m) => [m, E.laplace2d({ nx: NX, ny: NY, type: g.type, val: g.val, rho: g.src, method: m, maxIter: 20000, tol: 1e-4 }).iters])), [g]);
  const { m, gx, gy } = useMemo(() => E.gradMag(run.phi, NX, NY, g.type), [run, g]);
  const mean = (() => { let s = 0, n = 0; for (let k = 0; k < m.length; k++) if (g.type[k] === 0) { s += m[k]; n++; } return s / n; })();
  const mx = Math.max(...m), tipE = scn === 'tip' ? m[19 * NX + 32] : null;
  const load = (p) => { setScn(p.set.scn); if (p.set.rho != null) setRho(p.set.rho); else setRho(0); setCur(p.title); };
  const overlay = (ctx, sx, sy) => {
    ctx.fillStyle = 'rgba(14,17,20,.55)'; for (let k = 0; k < g.type.length; k++) if (g.type[k] === 2) ctx.fillRect((k % NX) * sx, Math.floor(k / NX) * sy, sx, sy);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2;
    for (let j = 2; j < NY - 1; j += 3) for (let i = 2; i < NX - 1; i += 3) { const k = j * NX + i, a = m[k]; if (g.type[k] !== 0 || a < 0.02 * mx) continue; const len = Math.min(1, a / (0.6 * mx + 1e-9)) * 12, ux = gx[k] / a, uy = gy[k] / a, x0 = (i + 0.5) * sx, y0 = (j + 0.5) * sy, x1 = x0 + ux * len, y1 = y0 + uy * len; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.arc(x1, y1, 1.6, 0, 7); ctx.fill(); }
  };
  return (
    <div>
      <Fund n={5} name="Laplace and Poisson equations" eq={'∇²φ = 0        (Laplace)\n∇²φ = −ρ/ε₀   (Poisson, with sources)'} words="No time, only space. φ is the potential, temperature, water head or velocity potential in a steady state, and it has no hills or valleys of its own: at every point it equals the average of its neighbours. Only the boundaries and sources shape it." type="Second-order, linear, elliptic PDE. A boundary-value problem, not an initial-value problem." needs="The value of φ (Dirichlet) or its normal derivative (Neumann) on the whole boundary, plus any source ρ." solution="Analytically: separation of variables, conformal maps. Numerically: replace φ by its neighbour average and repeat (Jacobi / Gauss–Seidel / SOR) until nothing changes." />
      <div className="grid">
        <div>
          <Panel title="Case and solver">
            <div className="row" style={{ marginBottom: 8 }}>{Object.entries(SC).map(([k, v]) => <button key={k} className={'btn' + (scn === k ? ' on' : '')} onClick={() => setScn(k)}>{v.label}</button>)}</div>
            <div className="row" style={{ marginBottom: 6 }}>Solver:{[['jacobi', 'Jacobi'], ['gs', 'Gauss–Seidel'], ['sor', 'SOR (ω = 1.9)']].map(([k, l]) => <button key={k} className={'btn' + (method === k ? ' on' : '')} onClick={() => setMethod(k)}>{l}</button>)}</div>
            <Slider label="iterations" value={li} min={0} max={4.3} step={0.02} onChange={setLi} fmt={() => iters} />
            {useRho && <Slider label="source ρ (Poisson)" value={rho} min={-1} max={1} step={0.05} onChange={setRho} fmt={(v) => v.toFixed(2)} />}
            <div className="kv" style={{ marginTop: 8 }}><Cell k="ITERATIONS TO CONVERGE: JACOBI" v={conv.jacobi} /><Cell k="GAUSS–SEIDEL" v={conv.gs} /><Cell k="SOR" v={conv.sor} /><Cell k="RESIDUAL NOW" v={run.residual.toExponential(1)} />{scn === 'tip' && <Cell k="FIELD AT TIP / AVERAGE" v={'×' + (tipE / mean).toFixed(1)} />}{scn !== 'tip' && <Cell k="PEAK |∇φ| / AVERAGE" v={'×' + (mx / mean).toFixed(1)} />}</div>
            <p className="note">Slide <b>iterations</b> up from 0: the boundary values “diffuse” into the interior. One Jacobi sweep is exactly one explicit heat-equation step with r = ¼, so Laplace’s equation is what heat flow settles to. SOR needs about {Math.round(conv.jacobi / Math.max(1, conv.sor))}× fewer iterations than Jacobi here, which is why real solvers use it.</p>
          </Panel>
          <Apps items={PRE.map((p) => ({ ...p, run: () => load(p) }))} current={cur} />
          <Links items={[['heat', 'Heat', 'Let a heat problem run until ∂u/∂t = 0 and the result satisfies Laplace’s equation.'], ['maxwell', 'Maxwell', 'Gauss’s law with E = −∇φ gives Poisson’s equation: this tab is electrostatics.'], ['wave', 'Wave', 'Replace “∂²/∂t²” by a second space direction and the hyperbolic equation becomes elliptic.']]} />
          <Check q="The temperature at an interior point of a steady plate is 20 °C higher than the average of its four neighbours. Is it in steady state?" a="No. In steady state with no sources, ∇²T = 0 means the value equals the neighbour average. The extra heat will flow away; the point will cool until it matches." />
          <Check q="Why does the field concentrate at a sharp tip?" a="The potential must drop from V to 0 over the same distance everywhere, but near a tip the equipotential lines are squeezed into a small region. A smaller radius means a steeper gradient |∇φ|, so the field is far above the average." />
          <Caveat>2D, uniform medium, coarse 64×48 grid. Real seepage and heat problems have layered materials; real electrodes are 3D. The structure of the solution is the same.</Caveat>
        </div>
        <div>
          <Stage title={`${S.label}: ${S.unit}`} legend={<span style={{ color: '#fff' }}>→ −∇φ (field / flow / heat-flow direction)</span>}>
            <Canvas2D nx={NX} ny={NY} values={run.phi} vmin={S.lo} vmax={S.hi} cmap={S.cmap} scale={10} overlay={overlay} label={S.label} />
            <p className="note">{scn === 'cap' && 'Orange = +1 V plate, blue = −1 V plate, outer box grounded. Arrows show the electric field, perpendicular to equipotentials.'}{scn === 'tip' && 'Top edge and needle at 1 V, bottom plane at 0 V. Arrows are longest around the tip.'}{scn === 'plate' && 'Left edge held hot (1), other edges cold (0); a heat source (ρ) in the middle adds a hot patch. Arrows show the direction heat flows.'}{scn === 'dam' && 'Reservoir (left, head 1) to tailwater (right, head 0). The dark column is an impermeable cut-off wall; the rest of the top surface under the dam is sealed. Arrows are the flow lines.'}</p>
          </Stage>
        </div>
      </div>
      <Bridge rows={[['∇²φ = 0', 'Mean-value property: each point equals the average of its neighbours.'], ['boundary-value problem', 'The boundary decides everything; there is no time evolution.'], ['−∇φ', 'Gradient gives the field, the flow velocity, or the heat flux: same operation everywhere.'], ['Ax = b', 'Discretising gives a huge sparse linear system; iterative solvers converge according to the eigenvalues of the iteration matrix.'], ['Poisson: ∇²φ = −ρ', 'Sources (charge, heat generation, wells) bend the potential.']]} />
    </div>
  );
}
