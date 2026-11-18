import { useState } from 'react';
import { Atom, Flame, Grid3x3, Magnet, Network, Orbit, Sigma, TrendingUp, Waves } from 'lucide-react';
import { GoCtx } from './ui.jsx';
import Thread from './modules/Thread.jsx';
import Newton from './modules/Newton.jsx';
import Expo from './modules/Expo.jsx';
import Heat from './modules/Heat.jsx';
import Wave from './modules/Wave.jsx';
import Laplace from './modules/Laplace.jsx';
import Maxwell from './modules/Maxwell.jsx';
import Schrodinger from './modules/Schrodinger.jsx';

const TABS = [
  { id: 'thread', label: 'The Common Thread', icon: Network, C: Thread, sub: 'Seven equations, a few ideas: how they connect to each other.' },
  { id: 'newton', label: '1 Newton', icon: Orbit, C: Newton, sub: 'Force sets acceleration. From a car suspension to a skydiver, it is one ODE.' },
  { id: 'expo', label: '2 Exponential', icon: TrendingUp, C: Expo, sub: 'Rate proportional to amount: radioactive decay, RC circuits, drug dosing, growth.' },
  { id: 'heat', label: '3 Heat', icon: Flame, C: Heat, sub: 'Diffusion smooths everything: concrete, chips, tissue, and image blur.' },
  { id: 'wave', label: '4 Wave', icon: Waves, C: Wave, sub: 'Disturbances travel and reflect: strings, soil, cables, ultrasound.' },
  { id: 'laplace', label: '5 Laplace / Poisson', icon: Grid3x3, C: Laplace, sub: 'The steady state: potential, temperature and seepage with no time.' },
  { id: 'maxwell', label: '6 Maxwell', icon: Magnet, C: Maxwell, sub: 'Electric and magnetic fields feeding each other: light, radar, shielding, coatings.' },
  { id: 'schrodinger', label: '7 Schrödinger', icon: Atom, C: Schrodinger, sub: 'A complex wave of probability: tunnelling, vibration, spreading.' },
];
export default function App() {
  const [id, setId] = useState('thread'), T = TABS.find((t) => t.id === id);
  const go = (to) => { setId(to); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return (
    <GoCtx.Provider value={go}>
      <div className="app">
        <div className="brand"><Sigma size={22} /> MATHBENCH · SEVEN</div>
        <h1>The “Magnificent Seven” Equations: Digital Twin</h1>
        <p className="sub">{T.sub}</p>
        <div className="tabs" role="tablist" aria-label="Equations">
          {TABS.map((t) => <button key={t.id} role="tab" aria-selected={id === t.id} className="tab" onClick={() => go(t.id)}><t.icon size={20} /> {t.label}</button>)}
        </div>
        <T.C key={id} />
      </div>
    </GoCtx.Provider>
  );
}
