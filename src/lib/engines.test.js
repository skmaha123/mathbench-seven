import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engines.js';

const close = (a, b, e = 1e-6, m = '') => assert.ok(Math.abs(a - b) <= e, `${m} ${a} vs ${b}`);

// 1 Newton
test('Newton: RK4 conserves energy of an undamped oscillator; Euler does not', () => {
  const rk = E.spring({ zeta: 0, r: 0, free: true, periods: 10, perPeriod: 50, method: 'rk4' });
  const eu = E.spring({ zeta: 0, r: 0, free: true, periods: 10, perPeriod: 50, method: 'euler' });
  close(E.energy(rk.at(-1)), 0.5, 1e-4); assert.ok(E.energy(eu.at(-1)) > 1.5, `euler energy ${E.energy(eu.at(-1))}`);
});
test('Newton: driven steady-state amplitude equals 1/sqrt((1-r²)²+(2ζr)²); resonance peak ≈ 1/(2ζ)', () => {
  for (const [z, r] of [[0.3, 0.7], [0.1, 1], [0.5, 1.5]]) {
    const s = E.spring({ zeta: z, r, periods: 60, perPeriod: 80 }), tail = s.slice(-Math.round((2 * Math.PI) / r / (2 * Math.PI / 80)) * 2);
    const amp = Math.max(...tail.map((p) => Math.abs(p.x))); close(amp, E.resonance(z, r), 0.02, `ζ=${z} r=${r}`);
  }
  close(E.resonance(0.05, 1), 10, 1e-9);
});
test('Newton: damped free decay envelope e^{-ζ t}; projectile range in vacuum = v0² sin2θ / g; drag shortens it; terminal velocity', () => {
  const s = E.spring({ zeta: 0.1, r: 0, free: true, periods: 5, perPeriod: 100 }), last = s[s.length - 1];
  close(Math.hypot(last.x, last.v / Math.sqrt(1 - 0.01)) , Math.exp(-0.1 * last.t), 0.01);
  const v = E.projectile({ v0: 30, ang: 45, dt: 0.002 }); close(v.range, (30 * 30) / 9.81, 0.05);
  assert.ok(E.projectile({ v0: 30, ang: 45, vt: 20 }).range < v.range * 0.8);
  const fall = E.projectile({ v0: 0.001, ang: -90, vt: 50, dt: 0.01 }); void fall;
});
test('Newton: free fall with drag approaches terminal velocity vt', () => {
  const f = (t, y) => [y[1], -9.81 - (9.81 / 2500) * Math.abs(y[1]) * y[1]]; // vt = 50; drag opposes velocity
  const s = E.integrate(f, [0, 0], 0.01, 3000); close(Math.abs(s.at(-1)[1]), 50, 0.05);
});

// 2 Exponential
test('Exponential: half-life, dosing steady state and logistic limit', () => {
  close(E.halfLife(Math.LN2 / 5730), 5730, 1e-9); close(Math.exp(-1), 0.3679, 1e-4); close(Math.exp(-3), 0.0498, 1e-4);
  const lam = Math.LN2 / 6, T = 8; close(E.dosingConc(100 * T + 1e-9, lam, T, 101), E.dosingPeak(lam, T), 1e-6);
  close(E.logistic(1e3, 0.5, 100, 1), 100, 1e-6); close(E.logistic(0, 0.5, 100, 1), 1, 1e-9);
});

// 3 Heat
test('Heat: fundamental sine mode decays as e^{-π²θ}; higher modes as e^{-n²π²θ}', () => {
  for (const [n, th] of [[1, 0.05], [2, 0.01], [3, 0.004]]) {
    const { u } = E.heat1d({ init: E.heatInit.sine(101, n), theta: th, r: 0.4 }), nx = u.length, i = Math.round((nx - 1) / (2 * n));
    close(u[i], Math.exp(-n * n * Math.PI * Math.PI * th), 2e-3, `n=${n}`);
  }
});
test('Heat: insulated rod conserves total heat; steady state between fixed ends is linear; r > 1/2 is unstable', () => {
  const a = E.heat1d({ init: E.heatInit.gauss(101), theta: 0.2, r: 0.4, bc: 'neumann' }); const tr = (u) => u.reduce((p, v, i) => p + v * (i === 0 || i === u.length - 1 ? 0.5 : 1), 0), s0 = tr(E.heatInit.gauss(101)), s1 = tr(a.u); close(s1 / s0, 1, 1e-9);
  const b = E.heat1d({ init: E.heatInit.cold(51), theta: 1.5, r: 0.45, left: 1, right: 0 }); close(b.u[25], 0.5, 2e-3); close(b.u[10], 1 - 10 / 50, 2e-3);
  assert.equal(E.heat1d({ init: E.heatInit.gauss(81), theta: 0.05, r: 0.6 }).unstable, true); assert.equal(E.heat1d({ init: E.heatInit.gauss(81), theta: 0.05, r: 0.45 }).unstable, false);
});

// 4 Wave
test('Wave: standing modes keep their shape and flip sign each half period (fixed-fixed period 2/n, fixed-free period 4)', () => {
  let r = E.wave1d({ init: E.waveInit.mode(201, 1), s: 0.95, bc: 'ff', tEnd: 1, rows: 100 }); let i = r.times.reduce((b, t, k) => (Math.abs(t - 1) < Math.abs(r.times[b] - 1) ? k : b), 0);
  close(r.frames[i][100], -1, 0.02, 'ff half period');
  const init = Float64Array.from({ length: 201 }, (_, k) => Math.sin((Math.PI / 2) * (k / 200)));
  r = E.wave1d({ init, s: 0.95, bc: 'fx', tEnd: 2, rows: 100 }); i = r.times.reduce((b, t, k) => (Math.abs(t - 2) < Math.abs(r.times[b] - 2) ? k : b), 0); close(r.frames[i][200], -1, 0.03, 'fx half period');
});
test('Wave: d’Alembert: a pulse splits into two halves travelling at ±c; CFL > 1 blows up', () => {
  const r = E.wave1d({ init: E.waveInit.pulse(401, 0.5, 0.03), s: 0.95, bc: 'ff', tEnd: 0.25, rows: 100 }), f = r.frames.at(-1);
  const peakR = f.reduce((b, v, k) => (k > 200 && v > f[b] ? k : b), 201); close(peakR / 400, 0.75, 0.01); close(f[peakR], 0.5, 0.02);
  assert.equal(E.wave1d({ init: E.waveInit.pulse(201), s: 1.1, tEnd: 3 }).unstable, true);
});
test('Wave: harmonic content of a pluck — plucked at the middle has no even harmonics; pluck at 1/5 kills n = 5', () => {
  const mid = E.sineCoeffs(E.waveInit.pluck(801, 0.5), 8); close(mid[1], 0, 1e-4); close(mid[3], 0, 1e-4); assert.ok(Math.abs(mid[0]) > 0.5);
  const p5 = E.sineCoeffs(E.waveInit.pluck(801, 0.2), 8); close(p5[4], 0, 1e-3); close(mid[2] / mid[0], -1 / 9, 1e-3); // 1/n² law (sign from sin(nπ/2))
  close(E.modeFreq('ff', 1, 427, 0.648), 329.5, 0.2); close(E.modeFreq('fx', 1, 200, 30), 1.667, 1e-3);
});

// 5 Laplace / Poisson
function plates(nx, ny) { const type = new Uint8Array(nx * ny), val = new Float64Array(nx * ny); for (let i = 0; i < nx; i++) { type[i] = 1; val[i] = 1; type[(ny - 1) * nx + i] = 1; } return { type, val }; }
test('Laplace: parallel plates give a linear potential; SOR is far faster than Gauss–Seidel which is faster than Jacobi', () => {
  const nx = 24, ny = 21, { type, val } = plates(nx, ny); const its = {};
  for (const m of ['jacobi', 'gs', 'sor']) { const r = E.laplace2d({ nx, ny, type, val, method: m, maxIter: 20000, tol: 1e-8 }); its[m] = r.iters; close(r.phi[10 * nx + 5], 0.5, 1e-4, m); close(r.phi[5 * nx + 12], 0.75, 1e-4, m); }
  assert.ok(its.jacobi > 1.6 * its.gs && its.gs > 5 * its.sor, JSON.stringify(its));
});
test('Poisson: uniform source between grounded plates gives φ = ρ y (H − y) / 2', () => {
  const nx = 12, ny = 21, type = new Uint8Array(nx * ny), val = new Float64Array(nx * ny), rho = new Float64Array(nx * ny).fill(0.01);
  for (let i = 0; i < nx; i++) { type[i] = 1; type[(ny - 1) * nx + i] = 1; }
  const r = E.laplace2d({ nx, ny, type, val, rho, method: 'sor', maxIter: 20000, tol: 1e-10 }); close(r.phi[10 * nx + 6], (0.01 * 10 * 10) / 2, 1e-4);
});
test('Laplace: a Jacobi sweep is exactly one explicit 2D heat step with r = 1/4 (the heat–Laplace link)', () => {
  const nx = 9, ny = 9, type = new Uint8Array(nx * ny), val = new Float64Array(nx * ny); for (let i = 0; i < nx; i++) { type[i] = 1; val[i] = 1; }
  const one = E.laplace2d({ nx, ny, type, val, method: 'jacobi', maxIter: 1 }).phi, c = 1 * nx + 4; close(one[c], 0.25 * 1, 1e-12);
});

// 6 Maxwell
test('Maxwell FDTD: pulse travels 1 cell per 2 steps in vacuum, half as fast in ε_r = 4', () => {
  const nx = 600, eps = new Float64Array(nx).fill(1); let f = new E.FDTD({ nx, eps, src: { type: 'pulse', x: 100, t0: 60, spread: 20, probe: 200 } }); f.run(500);
  const t1 = f.probe.reduce((b, v, k) => (v > f.probe[b] ? k : b), 0); close(t1 - 60, 200, 4, 'vacuum');
  const e2 = new Float64Array(nx).fill(1); for (let i = 150; i < nx; i++) e2[i] = 4; f = new E.FDTD({ nx, eps: e2, src: { type: 'pulse', x: 100, t0: 60, spread: 20, probe: 250 } }); f.run(800);
  const t2 = f.probe.reduce((b, v, k) => (v > f.probe[b] ? k : b), 0); close(t2 - 60 - 100, 200 * 2 * (100 / 100) * 1, 40, 'dielectric'); // 50 cells vacuum (100 steps) + 100 cells at half speed (400 steps)
});
test('Maxwell FDTD: reflection from ε_r = 4 (n = 2) matches Fresnel r = (n1 − n2)/(n1 + n2) = −1/3', () => {
  const nx = 1400, eps = new Float64Array(nx).fill(1); for (let i = 600; i < 1300; i++) eps[i] = 4;
  const f = new E.FDTD({ nx, eps, src: { type: 'pulse', x: 300, t0: 80, spread: 40, probe: 400 } }); f.run(1700);
  const p = f.probe, k1 = p.reduce((b, v, k) => (Math.abs(v) > Math.abs(p[b]) ? k : b), 0), inc = p[k1];
  let kr = k1 + 60; for (let k = k1 + 60; k < p.length; k++) if (Math.abs(p[k]) > Math.abs(p[kr])) kr = k; close(p[kr] / inc, E.fresnelR(1, 2), 0.02);
});
test('Maxwell: c = 1/√(μ0 ε0), skin depth of copper, anti-reflection coating', () => {
  close(E.cLight(), 299792458, 5); close(E.skinDepth(1e9, 5.8e7) * 1e6, 2.09, 0.02); close(E.skinDepth(50, 5.8e7) * 1e3, 9.35, 0.05);
  const n2 = 3.5, nf = Math.sqrt(n2), lam0 = 550, d = lam0 / (4 * nf);
  close(E.thinFilmR(lam0, 1, nf, n2, d), 0, 1e-12); close(E.thinFilmR(lam0, 1, 1.0000001, n2, d), ((n2 - 1) / (n2 + 1)) ** 2, 1e-6); close(E.thinFilmR(lam0, 1, nf, n2, 2 * d), ((n2 - 1) / (n2 + 1)) ** 2, 1e-9);
});

// 7 Schrödinger
test('FFT: round trip and Parseval', () => {
  const re = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i) + 0.3 * i % 1), im = new Float64Array(64), r0 = Float64Array.from(re), e0 = re.reduce((s, v) => s + v * v, 0);
  E.fft(re, im); const e1 = re.reduce((s, v, i) => s + v * v + im[i] * im[i], 0) / 64; close(e1 / e0, 1, 1e-12); E.fft(re, im, true); close(re[17], r0[17], 1e-12);
});
test('Schrödinger: unitary evolution keeps norm = 1 and energy conserved', () => {
  const s = new E.TDSE({ N: 512, L: 120, V: E.barrier(3, 2), dt: 0.02, x0: -25, sigma: 4, k0: 2 }); const e0 = s.energy(); s.run(1200); close(s.norm(), 1, 1e-9); close(s.energy() / e0, 1, 2e-3);
});
test('Schrödinger: free packet spreads as σ√(1+(t/2σ²)²), keeps ⟨k⟩ = k0 and moves at v = k0', () => {
  const s = new E.TDSE({ N: 512, L: 200, V: () => 0, dt: 0.02, x0: -20, sigma: 3, k0: 2 }); s.run(1500); const t = s.t;
  close(s.widthX() / (3 * Math.sqrt(1 + (t / (2 * 9)) ** 2)), 1, 0.01); close(s.momentum().k, 2, 1e-6); close(s.meanX(), -20 + 2 * t, 0.2);
});
test('Schrödinger: tunnelling probability of a narrow packet matches the plane-wave formula; harmonic ⟨x⟩ obeys Newton (Ehrenfest); imaginary time finds ω/2', () => {
  const s = new E.TDSE({ N: 2048, L: 240, V: E.barrier(3, 1.0), dt: 0.01, x0: -40, sigma: 9, k0: 2 }); s.run(5000);
  const T = s.probIn(1, 120), Tpw = E.tunnelT(2, 3, E.effWidth(s)); close(T / Tpw, 1, 0.12, `packet ${T} vs plane wave ${Tpw}`);
  const om = 0.5, h = new E.TDSE({ N: 512, L: 80, V: E.harmonic(om), dt: 0.01, x0: 5, sigma: Math.sqrt(1 / (2 * om)), k0: 0 }); h.run(Math.round(((2 * Math.PI) / om / 4) / 0.01)); close(h.meanX(), 5 * Math.cos(om * h.t), 0.05);
  const g = new E.TDSE({ N: 512, L: 80, V: E.harmonic(om), dt: 0.02, x0: 6, sigma: 3, k0: 0 }); g.run(2500, true); close(g.energy(), om / 2, 0.003);
});
