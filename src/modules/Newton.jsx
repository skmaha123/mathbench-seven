import { useMemo, useState } from 'react';
import * as E from '../lib/engines.js';
import { Panel, Stage, Slider, Cell, Bridge, Check, Plot, Caveat, Fund, Apps, Links, Warn, sci } from '../ui.jsx';

const PRE = [
  { tag: 'Mechanical', title: 'Car suspension at resonance', note: 'ωn ≈ 8 rad/s (1.3 Hz), ζ ≈ 0.3. Bumps every ~15 m at 70 km/h drive it at resonance.', set: { mode: 'spring', lw: 0.91, z: 0.31, r: 1 } },
  { tag: 'Civil', title: 'Footbridge and footsteps', note: 'Light footbridge, ωn ≈ 2π × 1.8 Hz, ζ ≈ 1%. Walking at ~2 Hz excites it: amplification ≈ 1/(2ζ) = 50.', set: { mode: 'spring', lw: 1.05, z: 0.01, r: 1 } },
  { tag: 'Civil', title: 'Tall building in wind', note: 'Period ≈ 4 s (ωn ≈ 1.6 rad/s), ζ ≈ 2%. Low damping is why towers use tuned mass dampers.', set: { mode: 'spring', lw: 0.2, z: 0.02, r: 0.9 } },
  { tag: 'ECE', title: 'MEMS / AFM cantilever', note: '300 kHz, Q ≈ 1000 (ζ = 1/2Q = 0.0005). Amplification of 1000× at resonance is how these sensors work.', set: { mode: 'spring', lw: 6.27, z: 0.0005, r: 1 } },
  { tag: 'Aerospace', title: 'Package dropped from a UAV', note: '50 m height, 12 m/s forward, terminal speed ≈ 20 m/s: drag matters.', set: { mode: 'proj', v0: 12, ang: 0, vt: 20, h0: 50 } },
  { tag: 'Mechanical', title: 'Football free kick', note: '25 m/s at 40°, terminal speed ≈ 33 m/s: drag cuts the vacuum range by a third.', set: { mode: 'proj', v0: 25, ang: 40, vt: 33, h0: 0 } },
];
export default function Newton() {
  const [mode, setMode] = useState('spring'), [lw, setLw] = useState(0.91), [z, setZ] = useState(0.31), [r, setR] = useState(1), [method, setMethod] = useState('rk4');
  const [v0, setV0] = useState(25), [ang, setAng] = useState(40), [vt, setVt] = useState(33), [h0, setH0] = useState(0), [cur, setCur] = useState('Car suspension at resonance');
  const load = (p) => { const s = p.set; setMode(s.mode); if (s.mode === 'spring') { setLw(s.lw); setZ(s.z); setR(s.r); } else { setV0(s.v0); setAng(s.ang); setVt(s.vt); setH0(s.h0); } setCur(p.title); };
  const wn = 10 ** lw, sim = useMemo(() => E.spring({ zeta: z, r, periods: 14, perPeriod: method === 'euler' ? 14 : 60, method }), [z, r, method]);
  const pk = (rr) => E.resonance(z, rr), curve = useMemo(() => Array.from({ length: 151 }, (_, i) => [(i / 150) * 3, Math.min(E.resonance(z, (i / 150) * 3), 20)]), [z]);
  const wd = Math.sqrt(Math.max(0, 1 - z * z)), amp = E.resonance(z, r), Q = 1 / (2 * Math.max(z, 1e-6));
  const proj = useMemo(() => E.projectile({ v0, ang, vt, h0, dt: 0.01 }), [v0, ang, vt, h0]), vac = useMemo(() => E.projectile({ v0, ang, h0, dt: 0.01 }), [v0, ang, h0]);
  const per = (2 * Math.PI) / wn;
  return (
    <div>
      <Fund n={1} name="Newton’s equation of motion" eq={'m d²x/dt² = F(x, v, t)\nspring + damper + drive:  m x″ + c x′ + k x = F₀ cos Ωt'} words="Force sets acceleration, acceleration changes velocity, velocity changes position. Everything in mechanics, from a satellite to a suspension, is this one sentence with a different F." type="Second-order ordinary differential equation (ODE). Linear if F is linear in x and v (spring, damper); nonlinear for quadratic drag." needs="Two initial conditions: x(0) and v(0). With them the future is fixed (determinism)." solution="Linear case: try x = e^(λt). The characteristic roots λ = −ζωₙ ± iωₙ√(1−ζ²) decide everything. Nonlinear case: step in time numerically (Euler, Runge–Kutta)." />
      <div className="grid">
        <div>
          <Panel title="Choose the system"><div className="row"><button className={'btn' + (mode === 'spring' ? ' on' : '')} onClick={() => setMode('spring')}>Mass–spring–damper</button><button className={'btn' + (mode === 'proj' ? ' on' : '')} onClick={() => setMode('proj')}>Projectile with drag</button></div></Panel>
          {mode === 'spring' ? (
            <Panel title="Oscillator (time measured in 1/ωₙ)">
              <Slider label="natural freq ωₙ" value={lw} min={-0.5} max={6.5} step={0.01} onChange={setLw} fmt={(v) => sci(10 ** v, 2) + ' rad/s'} />
              <Slider label="damping ζ" value={z} min={0} max={1.2} step={0.005} onChange={setZ} fmt={(v) => v.toFixed(3)} />
              <Slider label="drive ratio Ω/ωₙ" value={r} min={0} max={3} step={0.01} onChange={setR} fmt={(v) => v.toFixed(2)} />
              <div className="row" style={{ margin: '6px 0' }}>Integrator: <button className={'btn' + (method === 'rk4' ? ' on' : '')} onClick={() => setMethod('rk4')}>RK4</button><button className={'btn' + (method === 'euler' ? ' on' : '')} onClick={() => setMethod('euler')}>Euler (coarse)</button></div>
              {method === 'euler' && <Warn>Euler with 14 steps per period adds energy every step: the response grows even where physics says it should settle. Numerical method matters.</Warn>}
              <div className="kv"><Cell k="FREQUENCY fₙ = ωₙ/2π" v={sci(wn / 6.28319) + ' Hz'} /><Cell k="PERIOD" v={sci(per) + ' s'} /><Cell k="ROOTS λ/ωₙ" v={z < 1 ? `−${z.toFixed(2)} ± ${wd.toFixed(2)}i` : `−${(z - Math.sqrt(z * z - 1)).toFixed(2)}, −${(z + Math.sqrt(z * z - 1)).toFixed(2)}`} /><Cell k="AMPLITUDE AT THIS Ω" v={amp.toFixed(2) + ' × static'} /><Cell k="QUALITY Q = 1/(2ζ)" v={Q.toFixed(1)} /><Cell k="REGIME" v={z < 1 ? 'under-damped' : z === 1 ? 'critical' : 'over-damped'} /></div>
            </Panel>
          ) : (
            <Panel title="Projectile">
              <Slider label="launch speed" value={v0} min={1} max={60} step={0.5} onChange={setV0} fmt={(v) => v + ' m/s'} />
              <Slider label="launch angle" value={ang} min={-10} max={85} step={1} onChange={setAng} fmt={(v) => v + '°'} />
              <Slider label="terminal speed" value={vt} min={5} max={120} step={1} onChange={setVt} fmt={(v) => v + ' m/s'} />
              <Slider label="launch height" value={h0} min={0} max={100} step={1} onChange={setH0} fmt={(v) => v + ' m'} />
              <div className="kv" style={{ marginTop: 8 }}><Cell k="RANGE, NO DRAG" v={vac.range.toFixed(1) + ' m'} /><Cell k="RANGE, WITH DRAG" v={proj.range.toFixed(1) + ' m'} /><Cell k="FLIGHT TIME" v={proj.tof.toFixed(2) + ' s'} /><Cell k="PEAK HEIGHT" v={proj.maxh.toFixed(1) + ' m'} /></div>
              <p className="note">Drag acceleration is (g/vₜ²)|v|v, so vₜ = √(2mg/ρC_dA). Without drag the optimum angle is 45°; with drag it is lower and the path is steeper on the way down.</p>
            </Panel>
          )}
          <Apps items={PRE.map((p) => ({ ...p, run: () => load(p) }))} current={cur} />
          <Links items={[['expo', 'Exponential', 'Damped vibration is e^(−ζωt) × cosine: an exponential envelope on a rotation.'], ['wave', 'Wave', 'Connect N masses with springs and let N → ∞: Newton’s law becomes the wave equation.'], ['schrodinger', 'Schrödinger', 'For a quantum particle in a spring potential, ⟨x⟩ obeys exactly this ODE (Ehrenfest).']]} />
          <Check q="Why does a swing or footbridge respond so strongly when pushed at its own frequency?" a="At Ω = ωₙ the drive is always in step with the velocity, so it adds energy every cycle. Only damping limits it: the amplitude is 1/(2ζ) times the static deflection (50× for ζ = 1%)." />
          <Check q="The roots are λ = −ζωₙ ± iωₙ√(1−ζ²). What does the real part do, and what does the imaginary part do?" a="The real part −ζωₙ is the decay rate of the envelope e^(−ζωₙt); the imaginary part is the oscillation frequency ωd. Damping moves the roots left; ζ = 1 is where the two complex roots meet on the real axis." />
          <Caveat>one degree of freedom, linear spring and damper, a single sinusoidal force. Real structures have many modes, but each mode behaves like this one.</Caveat>
        </div>
        <div>
          {mode === 'spring' ? (<>
            <Stage title="Response x(t) / static deflection" legend={<span className="t">● x(t)</span>}>
              <Plot series={[{ pts: sim.map((s) => [s.t / (2 * Math.PI), s.x]), color: '#4fd6bd', w: 2 }]} xr={[0, 14]} yr={[-Math.max(2, Math.min(25, 1.15 * Math.max(...sim.map((s) => Math.abs(s.x))))), Math.max(2, Math.min(25, 1.15 * Math.max(...sim.map((s) => Math.abs(s.x)))))]} xl="time (natural periods)" yl="x / x_static" xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(1)} h={250} />
            </Stage>
            <Stage title="Resonance curve: steady amplitude versus drive frequency" legend={<span className="o">● your Ω/ωₙ</span>}>
              <Plot series={[{ pts: curve, color: '#b98ad0' }]} xr={[0, 3]} yr={[0, Math.min(20, Math.max(2, 1.1 * pk(Math.min(1, Math.sqrt(Math.max(0, 1 - 2 * z * z))))))]} xl="drive ratio Ω/ωₙ" yl="amplitude / static" mark={r} dots={[[r, Math.min(amp, 20), '#f0a43a']]} xfmt={(v) => v.toFixed(1)} yfmt={(v) => v.toFixed(0)} h={230} />
            </Stage>
            <Stage title="Phase portrait (x, v): the 2D linear system behind the ODE">
              <Plot series={[{ pts: sim.map((s) => [s.x, s.v]), color: '#f0a43a', w: 1.8 }]} xr={[-Math.max(2, Math.min(25, Math.max(...sim.map((s) => Math.abs(s.x))) * 1.1)), Math.max(2, Math.min(25, Math.max(...sim.map((s) => Math.abs(s.x))) * 1.1))]} yr={[-Math.max(2, Math.min(25, Math.max(...sim.map((s) => Math.abs(s.v))) * 1.1)), Math.max(2, Math.min(25, Math.max(...sim.map((s) => Math.abs(s.v))) * 1.1))]} xl="x" yl="v / ωₙ" xfmt={(v) => v.toFixed(1)} yfmt={(v) => v.toFixed(1)} h={250} />
              <p className="note">Writing y = (x, v) turns the second-order ODE into y′ = A y with eigenvalues λ above (the same eigenvalue problem as in your matrices course). Spiral in = stable focus; circle = no damping.</p>
            </Stage></>) : (
            <Stage title="Trajectory" legend={<><span className="t">● with drag</span><span className="p">- - vacuum</span></>}>
              <Plot series={[{ pts: vac.pts, color: '#b98ad0', dash: '5 4', w: 1.8 }, { pts: proj.pts, color: '#4fd6bd', w: 3 }]} xr={[0, Math.max(10, Math.ceil(Math.max(vac.range, proj.range) / 10) * 10)]} yr={[0, Math.max(5, Math.ceil(Math.max(vac.maxh, proj.maxh) / 5) * 5)]} xl="distance (m)" yl="height (m)" xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(0)} h={340} />
            </Stage>)}
        </div>
      </div>
      <Bridge rows={[['x″ = F/m', 'Newton’s law is a second-order ODE: needs x(0) and v(0).'], ['e^(λt), λ = −ζωₙ ± iωd', 'The solution of every linear vibration: the complex plane from the first tab decides the behaviour.'], ['y′ = A y', 'Any n-th order ODE is a first-order system; eigenvalues of A are the λ’s.'], ['RK4 / Euler', 'Numerical integration: accuracy and stability depend on step size.'], ['resonance 1/(2ζ)', 'The amplification factor you design against in suspensions, bridges and MEMS.']]} />
    </div>
  );
}
