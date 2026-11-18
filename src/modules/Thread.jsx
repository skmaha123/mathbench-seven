import { useMemo, useState } from 'react';
import * as E from '../lib/engines.js';
import { Panel, Stage, Slider, Cell, Bridge, Check, Plot, Caveat, useGo, sci } from '../ui.jsx';

const EQ = [
  ['newton', '1 Newton', 'm x″ = F', 'Force changes motion'],
  ['expo', '2 Exponential', 'N′ = −λN', 'Rate ∝ amount'],
  ['heat', '3 Heat', 'u_t = α u_xx', 'Spreads and smooths'],
  ['wave', '4 Wave', 'u_tt = c² u_xx', 'Travels and reflects'],
  ['laplace', '5 Laplace / Poisson', '∇²φ = −ρ', 'Steady balance'],
  ['maxwell', '6 Maxwell', '∇×E = −B_t, …', 'Fields feed each other'],
  ['schrodinger', '7 Schrödinger', 'iħψ_t = Hψ', 'Complex probability wave'],
];
const EDGES = [['expo', 'newton', 'roots e^(λt)'], ['expo', 'heat', 'modes e^(−αk²t)'], ['expo', 'schrodinger', 'phase e^(−iEt/ħ)'], ['newton', 'wave', 'N masses → ∞'], ['wave', 'maxwell', 'c = 1/√(με)'], ['heat', 'laplace', 'steady state'], ['laplace', 'maxwell', 'electrostatics'], ['heat', 'schrodinger', 't → −iτ'], ['schrodinger', 'newton', 'Ehrenfest'], ['wave', 'schrodinger', 'ω = ħk²/2m']];
const POS = Object.fromEntries(['newton', 'expo', 'heat', 'laplace', 'maxwell', 'wave', 'schrodinger'].map((k, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7; return [k, [260 + 200 * Math.cos(a), 200 + 150 * Math.sin(a)]]; }));
const LAM = [['Exponential decay · RC circuit', -0.8, 0], ['Heat mode (λ = −αk²)', -2.5, 0], ['Damped vibration (Newton, ζ = 0.2)', -0.4, 1.96], ['Pure oscillation (undamped spring, wave mode, Schrödinger phase)', 0, 3], ['Skin effect in a conductor (in space)', -1, 1], ['Tunnelling in the barrier (in space)', -1.5, 0], ['Growth · unstable scheme', 0.3, 0]];
const SPOT = [['A cup of coffee cools to room temperature.', 'Exponential (Newton’s cooling): excess temperature ∝ e^(−t/τ). If you want the temperature inside a thick object as it cools, use the heat equation.'], ['A guitar string is plucked.', 'Wave equation: standing modes, harmonics f_n = n c/2L, Fourier series.'], ['The temperature in a long wall whose two faces are held at 10 °C and 30 °C for a month.', 'Laplace (steady heat): linear profile in 1D, curved isotherms in 2D.'], ['A radar pulse reflects from an aircraft.', 'Maxwell (wave form): c = 1/√(μ₀ε₀), reflection from interfaces, skin depth in the metal.'], ['An electron approaches a thin insulating layer in a transistor.', 'Schrödinger: tunnelling probability ~ e^(−2κd); leakage current rises exponentially as the layer thins.'], ['A bridge shakes when people walk in step.', 'Newton: driven damped oscillator; amplification 1/(2ζ) at resonance.']];
const Dot = ({ cx, cy, c, r = 6 }) => <circle cx={cx} cy={cy} r={r} fill={c} stroke="#0e1114" strokeWidth="2" />;

export default function Thread() {
  const go = useGo(), [lam, setLam] = useState([-0.4, 1.96]), [N, setN] = useState(10), [er, setEr] = useState(1), [mr, setMr] = useState(1);
  const [a, b] = lam, W = 440, Hh = 300, px = (x) => 40 + ((x + 3) / 4.5) * (W - 60), py = (y) => Hh / 2 - (y / 4) * (Hh / 2 - 20);
  const click = (e) => { const r = e.currentTarget.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * Hh; setLam([Math.max(-3, Math.min(1.5, ((x - 40) / (W - 60)) * 4.5 - 3)), Math.max(-4, Math.min(4, ((Hh / 2 - y) / (Hh / 2 - 20)) * 4))]); };
  const resp = Array.from({ length: 201 }, (_, i) => { const t = (i / 200) * 10; return [t, Math.exp(a * t) * Math.cos(b * t)]; });
  const env = (s) => Array.from({ length: 101 }, (_, i) => { const t = (i / 100) * 10; return [t, s * Math.exp(a * t)]; });
  const cls = Math.abs(b) < 0.08 ? (a < -0.05 ? 'pure decay (real negative λ)' : a > 0.05 ? 'pure growth (real positive λ)' : 'constant') : a < -0.05 ? 'decaying oscillation (complex λ, left half-plane)' : a > 0.05 ? 'growing oscillation (unstable)' : 'sustained oscillation (imaginary λ)';
  const yy = Math.min(6, Math.max(1.2, Math.exp(Math.max(0, a) * 10)));
  const chain = useMemo(() => Array.from({ length: N }, (_, i) => [i + 1, 2 * Math.sin(((i + 1) * Math.PI) / (2 * (N + 1)))]), [N]), cont = Array.from({ length: N }, (_, i) => [i + 1, ((i + 1) * Math.PI) / (N + 1)]);
  const modes = useMemo(() => { const nx = 101, init = E.heatInit.gauss(nx, 0.1), ths = Array.from({ length: 17 }, (_, i) => (i / 16) * 0.06), co = ths.map((th) => E.sineCoeffs(E.heat1d({ init, theta: th, r: 0.4, bc: 'dirichlet' }).u, 6)); const a0 = co[0][0]; return { ths, num: [0, 2, 4].map((k) => co.map((c, i) => [ths[i], c[k] / a0])), ana: [0, 2, 4].map((k) => ths.map((th) => [th, (co[0][k] / a0) * Math.exp(-((k + 1) ** 2) * Math.PI * Math.PI * th)])) }; }, []);
  const c0 = E.cLight(), v = c0 / Math.sqrt(er * mr), ks = Array.from({ length: 61 }, (_, i) => (i / 60) * 3);
  const e1 = 1 - Math.sin(Math.PI / (2 * (N + 1))) / (Math.PI / (2 * (N + 1)));
  return (
    <div>
      <section className="panel" style={{ borderColor: 'var(--teal)' }}>
        <small className="o" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.16em' }}>THE BIG PICTURE</small>
        <h2 style={{ font: '700 32px "Barlow Condensed"', margin: '4px 0 6px' }}>Seven equations, a handful of ideas</h2>
        <p className="note" style={{ marginTop: 0, maxWidth: 900 }}>Almost every model in your engineering courses is a variation of seven equations. They are built from the same few pieces: <b>rates of change</b> (derivatives), <b>curvature</b> (second derivatives), the <b>complex exponential</b> e^(λt), and <b>Fourier modes</b>. Each tab goes from the fundamentals (what the equation says, what it needs, how it is solved) through a live solver to real applications from your branch. This page shows how they connect.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10, marginTop: 10 }}>{EQ.map(([id, n, f, d]) => <button key={id} className="btn" onClick={() => go(id)} style={{ textAlign: 'left', height: 'auto', padding: '10px 12px' }}><div style={{ font: '600 18px "Barlow Condensed"' }}>{n}</div><div style={{ font: '500 14px "JetBrains Mono"', color: 'var(--teal)' }}>{f}</div><div style={{ font: '400 14px Barlow', color: 'var(--mut)' }}>{d}</div></button>)}</div>
      </section>
      <div className="grid">
        <div>
          <Panel title="How they are related">
            <svg viewBox="0 0 520 400" width="100%" role="img" aria-label="Map of the seven equations and their relationships">
              {EDGES.map(([p, q, l], i) => { const [x1, y1] = POS[p], [x2, y2] = POS[q]; return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2f7f74" strokeWidth="1.5" opacity=".75" /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 3} fill="#8a949e" fontSize="10" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#1a1e23', strokeWidth: 3 }}>{l}</text></g>; })}
              {EQ.map(([id, n]) => { const [x, y] = POS[id]; return <g key={id} onClick={() => go(id)} style={{ cursor: 'pointer' }} tabIndex={0} role="button" aria-label={'Open ' + n} onKeyDown={(e) => e.key === 'Enter' && go(id)}><rect x={x - 52} y={y - 15} width="104" height="30" rx="8" fill="#143b36" stroke="#4fd6bd" /><text x={x} y={y + 5} fill="#e8ecef" fontSize="13" textAnchor="middle" fontWeight="600">{n}</text></g>; })}
            </svg>
            <p className="note">Click a node to open it. Every line is a real mathematical relationship: for example heat’s <b>steady state</b> is Laplace, and Schrödinger in <b>imaginary time</b> is heat.</p>
          </Panel>
          <Panel title="Pick a λ: the complex exponential e^(λt)">
            <p className="note" style={{ marginTop: 0 }}>Click in the plane (real part a, imaginary part b). The response is e^(at)cos(bt).</p>
            <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" role="img" aria-label="Complex plane for lambda" onClick={click} style={{ cursor: 'crosshair', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--line)' }}>
              <rect x="40" y="0" width={px(0) - 40} height={Hh} fill="rgba(79,214,189,.07)" /><rect x={px(0)} y="0" width={W - px(0)} height={Hh} fill="rgba(239,107,107,.07)" />
              <line x1="40" x2={W - 20} y1={py(0)} y2={py(0)} stroke="#566170" /><line x1={px(0)} x2={px(0)} y1="0" y2={Hh} stroke="#566170" />
              <text x={px(0) - 6} y="14" fill="#8a949e" fontSize="11" textAnchor="end">stable: decays</text><text x={px(0) + 6} y="14" fill="#8a949e" fontSize="11">grows</text>
              <text x={W - 20} y={py(0) - 6} fill="#8a949e" fontSize="11" textAnchor="end">Re λ</text><text x={px(0) + 6} y={Hh - 6} fill="#8a949e" fontSize="11">Im λ</text>
              <Dot cx={px(a)} cy={py(b)} c="#f0a43a" r={7} />{Math.abs(b) > 0.05 && <Dot cx={px(a)} cy={py(-b)} c="#f0a43a" r={5} />}
            </svg>
            <div className="row" style={{ margin: '8px 0' }}>{LAM.map(([l, x, y]) => <button key={l} className="btn" style={{ fontSize: 14 }} onClick={() => setLam([x, y])}>{l}</button>)}</div>
            <div className="kv"><Cell k="λ = a + ib" v={`${a.toFixed(2)} ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(2)}i`} /><Cell k="BEHAVIOUR" v={cls} /></div>
          </Panel>
        </div>
        <div>
          <Stage title="Response y(t) = e^(at) cos(bt)" legend={<><span className="t">● y(t)</span><span className="p">- - envelope e^(at)</span></>}>
            <Plot series={[{ pts: env(1), color: '#b98ad0', dash: '5 4', w: 1.3 }, { pts: env(-1), color: '#b98ad0', dash: '5 4', w: 1.3 }, { pts: resp, color: '#4fd6bd', w: 3 }]} xr={[0, 10]} yr={[-yy, yy]} xl="t (or x for spatial exponentials)" yl="y" xfmt={(x) => x.toFixed(0)} yfmt={(x) => x.toFixed(1)} h={250} />
            <p className="note">The real part a sets <b>decay or growth</b>; the imaginary part b sets <b>oscillation</b>. Left of the vertical axis: heat, RC, damping. On the axis: waves, undamped vibration, quantum phase. Right: growth and instability. Every equation in this project lives somewhere on this plane.</p>
          </Stage>
          <Stage title="Plug in a plane wave e^(i(kx − ωt)): every PDE becomes a relation between ω and k">
            <table className="bridge"><tbody>
              {[['Exponential', 'ω = −iλ', 'pure decay or growth, no space'], ['Newton (spring)', 'ω² = k/m', 'oscillation at one frequency'], ['Heat', 'ω = −iαk²', 'decays; short wavelengths die fastest'], ['Wave', 'ω = ±ck', 'travels at speed c, shape unchanged'], ['Maxwell', 'ω = ck/n', 'wave; k becomes complex in a conductor, giving skin depth'], ['Schrödinger', 'ω = ħk²/2m', 'travels, but each k at its own speed: spreads'], ['Laplace', 'e^(ikx)e^(−ky)', 'oscillates along the boundary, dies exponentially inward']].map(([e, r, t]) => <tr key={e}><td>{e}</td><td style={{ fontFamily: 'JetBrains Mono', color: 'var(--teal)' }}>{r}</td><td>{t}</td></tr>)}
            </tbody></table>
            <Plot series={[{ pts: ks.map((k) => [k, k]), color: '#4fd6bd' }, { pts: ks.map((k) => [k, 0.5 * k * k]), color: '#b98ad0' }, { pts: ks.map((k) => [k, k * k]), color: '#f0a43a', dash: '5 4' }]} xr={[0, 3]} yr={[0, 3]} xl="wavenumber k" yl="ω  (or decay rate)" xfmt={(x) => x.toFixed(1)} yfmt={(x) => x.toFixed(0)} h={210} />
            <p className="note"><span className="t">Teal: wave (ω = ck, straight line).</span> <span className="p">Purple: Schrödinger (ω = ħk²/2m, parabola).</span> <span className="o">Orange dashed: heat decay rate (αk²).</span> Same parabola shape, but ‘i’ turns decay into oscillation: that is the entire difference between diffusion and quantum waves.</p>
          </Stage>
        </div>
      </div>
      <div className="grid">
        <Stage title="Bridge A: Newton → wave. N masses on springs, lowest frequencies versus the continuum" legend={<><span className="t">● N masses (Newton)</span><span className="o">- - wave equation</span></>}>
          <div className="sl" style={{ gridTemplateColumns: '120px 1fr 60px' }}><span>masses N</span><input type="range" min="2" max="40" value={N} onChange={(e) => setN(+e.target.value)} /><output>{N}</output></div>
          <Plot series={[{ pts: cont, color: '#f0a43a', dash: '5 4', w: 2 }]} dots={chain.map(([x, y]) => [x, y, '#4fd6bd'])} xr={[0, N + 1]} yr={[0, 3.3]} xl="mode number n" yl="ω_n / √(K/m)" xfmt={(x) => x.toFixed(0)} yfmt={(x) => x.toFixed(1)} h={250} />
          <p className="note">Teal dots: exact normal-mode frequencies of N masses joined by springs, from F = ma: ω_n = 2√(K/m) sin(nπ/2(N+1)). Dashed: wave equation ω_n = nπc/L. The lowest modes agree to {(e1 * 100).toFixed(2)}% for N = {N}; at high n the discrete chain falls <b>below</b> the continuum (it cannot support wavelengths shorter than two masses). As N grows the dots sit on the line: Newton’s laws become the wave equation.</p>
        </Stage>
        <div>
          <Stage title="Bridge B: heat → exponential. Each Fourier mode decays as e^(−n²π²θ)" legend={<><span className="t">● simulation</span><span className="o">- - exact</span></>}>
            <Plot series={[...modes.num.map((s, i) => ({ pts: s, color: ['#4fd6bd', '#b98ad0', '#6aa8ff'][i], w: 2.8 })), ...modes.ana.map((s) => ({ pts: s, color: '#f0a43a', dash: '5 4', w: 1.5 }))]} xr={[0, 0.06]} yr={[-0.8, 1.1]} xl="θ = αt/L²" yl="mode amplitude / initial a₁" xfmt={(x) => x.toFixed(2)} yfmt={(x) => x.toFixed(1)} h={230} />
            <p className="note">A hot spot is a sum of sine modes n = 1, 3, 5 (teal, purple, blue). The solver (from the Heat tab) tracks the exact exponentials (orange dashed) for all three; mode 5 decays at 25 times the rate of mode 1, and the sign flips (−0.67 and +0.31 of mode 1 at the start) because of where the sine modes cross zero.</p>
          </Stage>
          <Stage title="Bridge C: Maxwell → wave speed. c = 1/√(μ₀ε₀)">
            <div className="kv"><Cell k="μ₀ (H/m)" v="1.2566×10⁻⁶" /><Cell k="ε₀ (F/m)" v="8.8542×10⁻¹²" /><Cell k="c = 1/√(μ₀ε₀)" v={c0.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' m/s'} /><Cell k={`SPEED IN MEDIUM c/√(ε_r μ_r)`} v={sci(v) + ' m/s'} /></div>
            <Slider label="ε_r" value={er} min={1} max={80} step={0.5} onChange={setEr} fmt={(x) => x.toFixed(1)} /><Slider label="μ_r" value={mr} min={1} max={5} step={0.1} onChange={setMr} fmt={(x) => x.toFixed(1)} />
            <p className="note">The measured constants μ₀ and ε₀, which come from magnets and capacitors, combine to the speed of light. Maxwell noticed this in 1862 and concluded light is an electromagnetic wave. Index n = √(ε_rμ_r) = {Math.sqrt(er * mr).toFixed(2)} for your values.</p>
          </Stage>
        </div>
      </div>
      <Panel title="Spot the equation: which one models it? (try before opening)">{SPOT.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</Panel>
      <Caveat>this page shows <b>relationships</b>, not full derivations. Each derivation (conservation of energy → heat, curl equations → wave) appears in the “Fundamentals” strip of its own tab.</Caveat>
      <Bridge rows={[['derivative', 'Rate of change: the heart of 1 (Newton) and 2 (exponential).'], ['second derivative', 'Curvature: the heart of heat, wave, Laplace, Schrödinger.'], ['e^(λt), e^(ikx)', 'Substituting these turns calculus into algebra; the roots/dispersion tell you everything.'], ['Fourier series', 'Any shape is a sum of modes; each mode obeys a simple ODE.'], ['numerical stability', 'Eigenvalues of the update rule: r ≤ ½ (heat), CFL ≤ 1 (wave).']]} />
    </div>
  );
}
