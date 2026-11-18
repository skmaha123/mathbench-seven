import { useState } from 'react';
import * as E from '../lib/engines.js';
import { Panel, Stage, Slider, Cell, Bridge, Check, Plot, Caveat, Fund, Apps, Links, sci } from '../ui.jsx';

const PRE = [
  { tag: 'Civil', title: 'Carbon-14 dating of timber', note: 'Half-life 5730 years. A beam with 25% of the original C-14 is two half-lives (11,460 y) old.', set: { mode: 'decay', half: 5730, unit: 'years', what: 'C-14 remaining' } },
  { tag: 'EE', title: 'RC circuit discharging', note: 'V(t) = V₀e^(−t/RC). With R = 10 kΩ, C = 100 µF, τ = RC = 1 s, so the half-life is 0.69 s.', set: { mode: 'decay', half: 0.693, unit: 's', what: 'capacitor voltage' } },
  { tag: 'Aerospace', title: 'Air pressure versus altitude', note: 'p = p₀e^(−h/H), scale height H ≈ 8.4 km, so pressure halves every ≈ 5.8 km. Here the exponent is distance, not time.', set: { mode: 'decay', half: 5.82, unit: 'km', what: 'air pressure' } },
  { tag: 'Mechanical', title: 'Coffee or brake disc cooling', note: 'Newton’s law of cooling: excess temperature decays as e^(−t/τ). Take τ ≈ 20 min, so half-life ≈ 14 min.', set: { mode: 'decay', half: 13.9, unit: 'min', what: 'excess temperature' } },
  { tag: 'Biology', title: 'Antibiotic dosing every 8 h', note: 'Elimination half-life 6 h. Each dose adds on top of the previous: concentration builds to a steady cycle.', set: { mode: 'dose', half: 6, interval: 8, unit: 'h' } },
  { tag: 'Biology', title: 'Bacteria doubling every 20 min', note: 'Unlimited growth is exponential; food or space runs out, so real growth levels off (logistic).', set: { mode: 'growth', half: 20, unit: 'min', what: 'population' } },
  { tag: 'CSE', title: 'Transistor count doubling ~2 years', note: 'Moore’s law is an exponential growth law; the logistic curve shows what physical limits do.', set: { mode: 'growth', half: 2, unit: 'years', what: 'transistors per chip' } },
];
export default function Expo() {
  const [mode, setMode] = useState('decay'), [half, setHalf] = useState(5730), [unit, setUnit] = useState('years'), [what, setWhat] = useState('C-14 remaining'), [n, setN] = useState(2);
  const [interval, setInterval_] = useState(8), [K, setK] = useState(30), [cur, setCur] = useState('Carbon-14 dating of timber');
  const load = (p) => { const s = p.set; setMode(s.mode); setHalf(s.half); setUnit(s.unit); if (s.what) setWhat(s.what); if (s.interval) setInterval_(s.interval); setCur(p.title); setN(2); };
  const lam = Math.LN2 / half, tau = 1 / lam;
  // decay / growth curves in units of half-lives
  const dec = Array.from({ length: 121 }, (_, i) => [(i / 120) * 6, Math.pow(0.5, (i / 120) * 6)]);
  const gro = Array.from({ length: 121 }, (_, i) => [(i / 120) * 8, Math.pow(2, (i / 120) * 8)]);
  const log = Array.from({ length: 121 }, (_, i) => [(i / 120) * 8, E.logistic((i / 120) * 8, Math.LN2, K, 1)]);
  const ndoses = 12, tEnd = ndoses * interval, dose = Array.from({ length: 481 }, (_, i) => [(i / 480) * tEnd, E.dosingConc((i / 480) * tEnd, lam, interval, ndoses)]);
  const peak = E.dosingPeak(lam, interval), trough = peak * Math.exp(-lam * interval);
  const real = (x) => (x * half).toFixed(x * half < 10 ? 2 : 0) + ' ' + unit;
  return (
    <div>
      <Fund n={2} name="Exponential growth and decay" eq={'dN/dt = −λ N   →   N(t) = N₀ e^(−λt)\n(λ < 0 in the same formula gives growth)'} words="The rate of change is proportional to the amount present. The bigger the pile, the faster it shrinks (or grows). One number, λ, describes the whole story: half-life t½ = ln 2 / λ, time constant τ = 1/λ." type="First-order linear ODE. The simplest differential equation, and the building block of all the others." needs="One initial condition N(0) and one rate λ." solution="Separate variables: ∫dN/N = −λ∫dt, so ln N = −λt + C. Equivalent: try N = e^(st) and get s = −λ." />
      <div className="grid">
        <div>
          <Panel title="Choose the behaviour"><div className="row">{[['decay', 'Decay'], ['growth', 'Growth + limits'], ['dose', 'Repeated doses']].map(([k, l]) => <button key={k} className={'btn' + (mode === k ? ' on' : '')} onClick={() => setMode(k)}>{l}</button>)}</div></Panel>
          <Panel title="Parameters">
            <Slider label="half-life / doubling time" value={Math.log10(half)} min={-1} max={4.2} step={0.01} onChange={(v) => setHalf(10 ** v)} fmt={(v) => sci(10 ** v) + ' ' + unit} />
            {mode === 'dose' && <Slider label="dose interval" value={interval} min={1} max={24} step={0.5} onChange={setInterval_} fmt={(v) => v + ' h'} />}
            {mode === 'growth' && <Slider label="carrying capacity K" value={K} min={5} max={200} step={1} onChange={setK} fmt={(v) => '×' + v} />}
            <div className="kv" style={{ marginTop: 8 }}><Cell k="RATE λ = ln2 / t½" v={sci(lam) + ' per ' + unit} /><Cell k="TIME CONSTANT τ = 1/λ" v={sci(tau) + ' ' + unit} />
              {mode === 'dose' ? <><Cell k="STEADY PEAK / DOSE" v={peak.toFixed(2) + '×'} /><Cell k="STEADY TROUGH / DOSE" v={trough.toFixed(2) + '×'} /></> : <><Cell k="AFTER 1τ / 2τ / 3τ" v="36.8% / 13.5% / 5.0%" /><Cell k="AFTER 5 HALF-LIVES" v="3.1%" /></>}</div>
            {mode === 'decay' && <><Slider label="look at time" value={n} min={0} max={6} step={0.05} onChange={setN} fmt={(v) => v.toFixed(2) + ' t½'} /><p className="note">{what}: after <b>{real(n)}</b> only <b>{(Math.pow(0.5, n) * 100).toFixed(1)}%</b> is left. Half-life does not depend on how much you start with.</p></>}
            {mode === 'growth' && <p className="note">Pure exponential (teal) doubles every {sci(half)} {unit}; after 8 doublings it is ×256. The logistic curve (purple) follows it at first and then flattens at K = {K}. <b>Exponential growth cannot continue forever.</b></p>}
            {mode === 'dose' && <p className="note">Accumulation factor = {peak.toFixed(2)}: with a dose every {interval} h and t½ = {half.toFixed(1)} h, the peak settles near {peak.toFixed(2)} doses. Steady peak = 1/(1 − e^(−λT)). Because the ODE is linear, each dose’s decay simply adds (superposition).</p>}
          </Panel>
          <Apps items={PRE.map((p) => ({ ...p, run: () => load(p) }))} current={cur} />
          <Links items={[['newton', 'Newton', 'Damped vibration = exponential decay × oscillation. Overdamped motion is pure exponential.'], ['heat', 'Heat', 'Every Fourier mode of a cooling rod decays as e^(−αk²t).'], ['schrodinger', 'Schrödinger', 'Quantum phase is an exponential with an imaginary exponent, e^(−iEt/ħ); tunnelling is an exponential in space.']]} />
          <Check q="A drug has half-life 6 h. How much is left after 24 h, and when is it essentially gone?" a="24 h = 4 half-lives: (½)⁴ = 6.25% left. After 5 half-lives (30 h) about 3% remains, which is why ‘5 half-lives’ is the usual rule of thumb for being nearly eliminated." />
          <Check q="Why does the steady-state peak in repeated dosing not grow forever?" a="Elimination is proportional to concentration, so it rises with the level. It balances the dose when the amount lost per interval equals the dose: peak = D/(1 − e^(−λT))." />
          <Caveat>one compartment, first-order elimination, instant absorption, unlimited resources in the growth mode. Real drugs and populations have more compartments and limits.</Caveat>
        </div>
        <div>
          {mode === 'decay' && (<>
            <Stage title={`Decay: ${what} (linear scale)`} legend={<span className="o">● now</span>}>
              <Plot series={[{ pts: dec, color: '#4fd6bd' }]} xr={[0, 6]} yr={[0, 1]} xl="time (half-lives)" yl="fraction remaining" mark={n} dots={[[n, Math.pow(0.5, n), '#f0a43a']]} xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(2)} h={260} />
            </Stage>
            <Stage title="Same curve on a log axis becomes a straight line">
              <Plot series={[{ pts: dec.map(([x, y]) => [x, Math.log10(y)]), color: '#b98ad0' }]} xr={[0, 6]} yr={[-2, 0]} xl="time (half-lives)" yl="log₁₀ fraction" mark={n} dots={[[n, Math.log10(Math.pow(0.5, n)), '#f0a43a']]} xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(1)} yt={4} h={230} />
              <p className="note">ln N = ln N₀ − λt: a straight line of slope −λ. If your measured data fall on a line in a semi-log plot, an exponential law is at work, and the slope gives λ.</p>
            </Stage></>)}
          {mode === 'growth' && (
            <Stage title="Exponential growth versus logistic limit" legend={<><span className="t">● exponential</span><span className="p">● logistic (limit K)</span></>}>
              <Plot series={[{ pts: gro, color: '#4fd6bd' }, { pts: log, color: '#b98ad0' }]} xr={[0, 8]} yr={[0, Math.max(K * 1.1, 10)]} xl="time (doubling times)" yl={what + ' (× initial)'} xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(0)} h={340} />
              <p className="note">One doubling time on the axis = {sci(half)} {unit}. Logistic: dN/dt = rN(1 − N/K), the same exponential with a brake.</p>
            </Stage>)}
          {mode === 'dose' && (
            <Stage title="Concentration with repeated dosing (units of one dose)" legend={<><span className="t">● concentration</span><span className="o">- - steady peak</span></>}>
              <Plot series={[{ pts: dose, color: '#4fd6bd' }, { pts: [[0, peak], [tEnd, peak]], color: '#f0a43a', dash: '5 4', w: 1.5 }, { pts: [[0, trough], [tEnd, trough]], color: '#b98ad0', dash: '5 4', w: 1.5 }]} xr={[0, tEnd]} yr={[0, Math.ceil(peak * 1.15 * 2) / 2]} xl="time (hours)" yl="concentration (doses)" xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(1)} h={340} />
            </Stage>)}
        </div>
      </div>
      <Bridge rows={[['dN/dt = −λN', 'The simplest ODE: rate proportional to amount. First-order, linear.'], ['e^(st)', 'Try this in any linear ODE: it turns calculus into algebra (the characteristic equation).'], ['ln N versus t', 'Straight-line test for exponential behaviour; the slope is −λ.'], ['superposition', 'Linear ODEs add: repeated doses, and later, many Fourier modes.'], ['λ real vs imaginary', 'Real: decay or growth. Imaginary: oscillation. See “Common Thread”.']]} />
    </div>
  );
}
