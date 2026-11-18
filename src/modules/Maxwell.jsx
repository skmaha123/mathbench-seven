import { useEffect, useMemo, useRef, useState } from 'react';
import * as E from '../lib/engines.js';
import { Panel, Stage, Slider, Cell, Bridge, Check, Plot, Caveat, Fund, Apps, Links, sci } from '../ui.jsx';

const NX = 800, SRC = 150, PROBE = 300, FRONT = 450, MAT = { copper: ['Copper', 5.8e7, 1], aluminium: ['Aluminium', 3.5e7, 1], steel: ['Steel (μr ≈ 200)', 1e7, 200], sea: ['Sea water', 4, 1] };
const PRE = [
  { tag: 'Civil', title: 'Window glass (ε_r = 2.25, n = 1.5)', note: 'Each glass surface reflects R = ((n−1)/(n+1))² = 4% of light. Two surfaces: the faint double reflection in a shop window.', run: (s) => { s.setEps(2.25); s.setThick(250); s.setSrc('pulse'); } },
  { tag: 'ECE', title: 'PCB dielectric (ε_r ≈ 4.4)', note: 'Signals in the board travel at c/√ε_r ≈ 0.48 c and reflect at impedance changes; the same Fresnel logic as light, applied to transmission lines.', run: (s) => { s.setEps(4.4); s.setThick(250); s.setSrc('pulse'); } },
  { tag: 'ECE', title: 'Anti-reflection coating on a silicon cell', note: 'Bare silicon (n = 3.5) reflects 31%. A quarter-wave film with n = √3.5 cancels it at the design wavelength.', run: (s) => { s.setFilm({ scn: 'ar', nf: Math.sqrt(3.5), d: 73.5 }); } },
  { tag: 'Aerospace', title: 'Radome: half-wave wall', note: 'A radar dome wall one half-wavelength thick (inside the material) reflects nothing at that frequency: 9.4 mm for n = 1.6 at 10 GHz.', run: (s) => { s.setFilm({ scn: 'radome', nf: 1.6, d: 171.9 }); } },
  { tag: 'EE', title: 'Shielding a 1 GHz signal with copper', note: 'δ ≈ 2 µm: a few micrometres of copper plating stops the wave (4.6δ = 99% attenuation).', run: (s) => { s.setMat('copper'); s.setLf(9); } },
  { tag: 'EE', title: 'Talking to submarines', note: 'Sea water σ = 4 S/m: at 100 Hz the skin depth is ≈ 25 m; at 1 GHz it is millimetres. That is why submarine radio uses very low frequencies.', run: (s) => { s.setMat('sea'); s.setLf(2); } },
];
export default function Maxwell() {
  const [epsr, setEps] = useState(4), [thick, setThick] = useState(250), [sig, setSig] = useState(0), [srcK, setSrc] = useState('pulse'), [lam, setLam] = useState(70), [running, setRun] = useState(true), [tick, setTick] = useState(0), [cur, setCur] = useState('');
  const [film, setFilm] = useState({ scn: 'ar', nf: Math.sqrt(3.5), d: 73.5 }), [mat, setMat] = useState('copper'), [lf, setLf] = useState(9);
  const sim = useRef(null), raf = useRef(0);
  const build = () => {
    const eps = new Float64Array(NX).fill(1), sg = new Float64Array(NX);
    for (let i = FRONT; i < Math.min(NX - 40, FRONT + thick); i++) { eps[i] = epsr; sg[i] = sig; }
    sim.current = new E.FDTD({ nx: NX, eps, sigma: sg, src: srcK === 'pulse' ? { type: 'pulse', x: SRC, t0: 100, spread: 40, probe: PROBE } : { type: 'sine', x: SRC, omega: (2 * Math.PI) / lam, probe: PROBE } }); setTick((t) => t + 1);
  };
  useEffect(build, [epsr, thick, sig, srcK, lam]);
  useEffect(() => { let alive = true; const loop = () => { if (!alive) return; if (running && sim.current && sim.current.n < 4200) { sim.current.run(14); setTick((t) => t + 1); } raf.current = requestAnimationFrame(loop); }; raf.current = requestAnimationFrame(loop); return () => { alive = false; cancelAnimationFrame(raf.current); }; }, [running]);
  const f = sim.current, n = Math.sqrt(epsr), fr = E.fresnelR(1, n);
  const meas = (() => { if (!f || srcK !== 'pulse' || epsr === 1 || thick < 100) return null; const p = f.probe; if (p.length < 1500 + 600) return null; const k1 = p.reduce((b, v, k) => (Math.abs(v) > Math.abs(p[b]) ? k : b), 0), end = Math.min(p.length, k1 + 600 + Math.round((4 * thick * n) / 2)); let kr = k1 + 300; for (let k = k1 + 300; k < end; k++) if (Math.abs(p[k]) > Math.abs(p[kr])) kr = k; return p[kr] / p[k1]; })();
  const xs = (a) => Array.from(a, (v, i) => [i, v]);
  const ym = f ? Math.max(0.25, Math.min(3, 1.2 * Math.max(...f.E.map(Math.abs)))) : 0.7;
  const bands = [[FRONT, Math.min(NX - 40, FRONT + thick), 'rgba(240,164,58,.15)']];
  const lamc = useMemo(() => Array.from({ length: 81 }, (_, i) => 400 + i * 5), []);
  const n2 = film.scn === 'ar' ? 3.5 : 1, lam0 = 550, bare = (l) => E.thinFilmR(l, 1, n2 === 1 ? 1.000001 : n2, n2, 1) * 100;
  const dopt = lam0 / (4 * film.nf), dsk = E.skinDepth(10 ** lf, MAT[mat][1], MAT[mat][2]);
  const setters = { setEps, setThick, setSrc, setFilm, setMat, setLf };
  const load = (p) => { p.run(setters); setCur(p.title); };
  return (
    <div>
      <Fund n={6} name="Maxwell’s equations" eq={'∇·E = ρ/ε₀        ∇·B = 0\n∇×E = −∂B/∂t    ∇×B = μ₀J + μ₀ε₀ ∂E/∂t'} words="Charges make electric fields (Gauss). There are no magnetic charges. A changing magnetic field makes an electric field (Faraday). Currents and, crucially, changing electric fields make magnetic fields (Ampère–Maxwell). The last two feed each other: a self-sustaining wave." type="Four coupled first-order linear PDEs for the vectors E and B. Together they imply the wave equation for E and B." needs="Sources ρ and J, material properties ε, μ, σ, and boundary/interface conditions." solution="Statics: reduce to Poisson (see Laplace tab). Dynamics: eliminate B to get ∂²E/∂t² = c²∇²E with c = 1/√(μ₀ε₀) ≈ 3×10⁸ m/s. Numerically: FDTD updates E from the curl of H and H from the curl of E, alternating in time." />
      <div className="grid">
        <div>
          <Panel title="Pulse meets a dielectric (1D FDTD)">
            <div className="row" style={{ marginBottom: 6 }}>{[['pulse', 'Pulse'], ['sine', 'Continuous wave']].map(([k, l]) => <button key={k} className={'btn' + (srcK === k ? ' on' : '')} onClick={() => setSrc(k)}>{l}</button>)}<button className="btn" onClick={() => setRun(!running)}>{running ? 'Pause' : 'Run'}</button><button className="btn" onClick={build}>Restart</button></div>
            <Slider label="slab ε_r" value={epsr} min={1} max={12} step={0.25} onChange={setEps} fmt={(v) => v.toFixed(2)} />
            <Slider label="slab thickness" value={thick} min={20} max={300} step={10} onChange={setThick} fmt={(v) => v + ' cells'} />
            <Slider label="conductivity σ" value={sig} min={0} max={0.02} step={0.0005} onChange={setSig} fmt={(v) => v.toFixed(4)} />
            {srcK === 'sine' && <Slider label="wavelength (vacuum)" value={lam} min={30} max={140} step={1} onChange={setLam} fmt={(v) => v + ' cells'} />}
            <div className="kv" style={{ marginTop: 8 }}><Cell k="REFRACTIVE INDEX n = √ε_r" v={n.toFixed(2)} /><Cell k="SPEED IN SLAB c/n" v={(1 / n).toFixed(2) + ' c'} /><Cell k="FRESNEL r = (1−n)/(1+n)" v={fr.toFixed(3)} /><Cell k="REFLECTED POWER R = r²" v={(fr * fr * 100).toFixed(1) + '%'} /><Cell k="MEASURED r (simulation)" v={meas == null ? (srcK === 'pulse' ? (epsr === 1 ? 'no interface' : 'running…') : 'pulse mode only') : meas.toFixed(3)} /><Cell k="TIME STEP" v={f ? f.n : 0} /></div>
            <p className="note">E (teal) and −H (orange) travel together in vacuum. Entering the slab the wave <b>slows down</b> (ε_r larger), the pulse <b>compresses</b>, and <b>part is reflected, inverted</b> since n &gt; 1, with the amplitude predicted by Fresnel. H is larger in the slab because E/H = 1/n there. With σ &gt; 0 the wave dies out inside: skin effect.</p>
          </Panel>
          <Panel title="Thin film: reflection from Maxwell’s interface conditions">
            <div className="row" style={{ marginBottom: 6 }}>{[['ar', 'Film on silicon (n = 3.5)'], ['radome', 'Wall in air (radome)']].map(([k, l]) => <button key={k} className={'btn' + (film.scn === k ? ' on' : '')} onClick={() => setFilm({ ...film, scn: k })}>{l}</button>)}</div>
            <Slider label="film index n_f" value={film.nf} min={1.1} max={3.4} step={0.01} onChange={(v) => setFilm({ ...film, nf: v })} fmt={(v) => v.toFixed(2)} />
            <Slider label="film thickness d" value={film.d} min={10} max={400} step={1} onChange={(v) => setFilm({ ...film, d: v })} fmt={(v) => v + ' nm'} />
            <div className="kv" style={{ marginTop: 8 }}><Cell k="R AT 550 nm, NO FILM" v={film.scn === 'ar' ? bare(550).toFixed(1) + '%' : '0%'} /><Cell k="R AT 550 nm, WITH FILM" v={(E.thinFilmR(550, 1, film.nf, n2, film.d) * 100).toFixed(2) + '%'} /><Cell k={film.scn === 'ar' ? 'IDEAL n_f = √n_sub' : 'ZERO-R WALL d = λ/(2n)'} v={film.scn === 'ar' ? Math.sqrt(3.5).toFixed(2) : (lam0 / (2 * film.nf)).toFixed(0) + ' nm'} /><Cell k={film.scn === 'ar' ? 'QUARTER-WAVE d = λ/(4n)' : 'FILM PHASE 2δ'} v={film.scn === 'ar' ? dopt.toFixed(1) + ' nm' : ((4 * Math.PI * film.nf * film.d) / lam0 / Math.PI).toFixed(2) + ' π'} /></div>
            <p className="note">Two reflected waves, from the front and back of the film, are added as <b>complex numbers</b>. Quarter-wave thickness delays the second by half a cycle so they cancel (destructive interference). Same arithmetic as the interferometer in the quantum project.</p>
          </Panel>
          <Panel title="Skin depth: how far a wave gets into a conductor">
            <div className="row" style={{ marginBottom: 6 }}>{Object.entries(MAT).map(([k, v]) => <button key={k} className={'btn' + (mat === k ? ' on' : '')} onClick={() => setMat(k)}>{v[0]}</button>)}</div>
            <Slider label="frequency" value={lf} min={0} max={10} step={0.05} onChange={setLf} fmt={(v) => (10 ** v >= 1e9 ? (10 ** v / 1e9).toFixed(2) + ' GHz' : 10 ** v >= 1e6 ? (10 ** v / 1e6).toFixed(2) + ' MHz' : 10 ** v >= 1e3 ? (10 ** v / 1e3).toFixed(2) + ' kHz' : (10 ** v).toFixed(1) + ' Hz')} />
            <div className="kv"><Cell k="SKIN DEPTH δ = 1/√(π f μ σ)" v={dsk >= 1 ? dsk.toFixed(1) + ' m' : dsk >= 1e-3 ? (dsk * 1e3).toFixed(2) + ' mm' : (dsk * 1e6).toFixed(2) + ' µm'} /><Cell k="99% SHIELD 4.6 δ" v={4.6 * dsk >= 1 ? (4.6 * dsk).toFixed(1) + ' m' : 4.6 * dsk >= 1e-3 ? (4.6 * dsk * 1e3).toFixed(2) + ' mm' : (4.6 * dsk * 1e6).toFixed(1) + ' µm'} /></div>
            <p className="note">The field inside a conductor falls as e^(−x/δ): an exponential, again. Higher frequency means a thinner skin.</p>
          </Panel>
          <Apps items={PRE.map((p) => ({ ...p, run: () => load(p) }))} current={cur} />
          <Links items={[['laplace', 'Laplace', 'Static case of Gauss’s law: E = −∇φ, ∇²φ = −ρ/ε₀. That tab is electrostatics.'], ['wave', 'Wave', 'Faraday and Ampère–Maxwell combine into the wave equation, with c = 1/√(μ₀ε₀).'], ['schrodinger', 'Schrödinger', 'Photons and electrons both obey wave equations; both show interference, reflection, tunnelling (evanescent waves).']]} />
          <Check q="Why does the pulse become shorter (in space) inside the slab but keep the same duration in time?" a="Frequency does not change at an interface; the speed drops to c/n, so wavelength λ = v/f shrinks by n. A pulse with the same duration but slower travel is spatially compressed." />
          <Check q="You want a lens coating on glass (n = 1.5) to cancel reflection at 550 nm. What index and thickness?" a="n_f = √1.5 ≈ 1.22 and d = λ/(4n_f) ≈ 112 nm. (Magnesium fluoride, n = 1.38, is the practical choice: it reduces reflection from 4% to about 1.3%.)" />
          <Caveat>1D plane waves at normal incidence, non-magnetic materials, non-dispersive ε. No polarisation, angle or frequency-dependent loss. The four equations themselves are exact; the model keeps only the part you can see in one dimension.</Caveat>
        </div>
        <div>
          <Stage title="Fields along the line: Faraday and Ampère feeding each other" legend={<><span className="t">● E</span><span className="o">● −H</span><span className="p">▮ slab · | source · | probe</span></>}>
            <Plot series={[{ pts: xs(f ? f.E : []), color: '#4fd6bd', w: 2.4 }, { pts: xs(f ? f.H : []).map(([x, y]) => [x + 0.5, -y]), color: '#f0a43a', w: 1.6 }]} xr={[0, NX]} yr={[-ym, ym]} bands={bands} xl="position (cells)" yl="field (arbitrary units)" xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(2)} xticks={[0, 100, 200, 300, 400, 500, 600, 700, 800]} h={310} mark={SRC} />
            <p className="note">Update rule used: <b>H ← H + Δt·∇×E</b> (Faraday), then <b>E ← E + Δt·∇×H</b> (Ampère–Maxwell), repeated. Each field’s change is driven by the other’s curl: that alternation is the wave.</p>
          </Stage>
          <Stage title="Thin-film reflectance versus wavelength" legend={<><span className="p">● no film</span><span className="t">● with film</span></>}>
            <Plot series={[{ pts: lamc.map((l) => [l, film.scn === 'ar' ? bare(l) : 0]), color: '#b98ad0', dash: '5 4' }, { pts: lamc.map((l) => [l, E.thinFilmR(l, 1, film.nf, n2, film.d) * 100]), color: '#4fd6bd', w: 3 }]} xr={[400, 800]} yr={[0, film.scn === 'ar' ? 40 : 30]} xl="wavelength (nm)" yl="reflectance R (%)" mark={550} xfmt={(v) => v.toFixed(0)} yfmt={(v) => v.toFixed(0)} h={240} />
            <p className="note">The dip is the design wavelength; away from it the film works less well, which is why coated glass has a faint colour.</p>
          </Stage>
        </div>
      </div>
      <Bridge rows={[['∇×E = −∂B/∂t', 'Curl: how much a field circulates. A changing B creates circulating E (generators, transformers).'], ['∇·E = ρ/ε₀', 'Divergence: sources. In statics it becomes Poisson’s equation.'], ['c = 1/√(μ₀ε₀)', 'Combining the two curl equations gives the wave equation: light is an electromagnetic wave.'], ['n = √(ε_r μ_r)', 'Slower speed in matter, and the reflection coefficient (n₁−n₂)/(n₁+n₂) at an interface.'], ['e^(−x/δ)', 'In a conductor the wave decays exponentially; skin depth sets shielding and antenna design.']]} />
    </div>
  );
}
