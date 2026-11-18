// Numerical engines for the "Magnificent Seven" twins. Pure JS, no React, unit-tested with `npm test`.
export const TAU = 2 * Math.PI;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BIG = 1e6;

// ============ 1. Newton: m x'' = F ============
export function integrate(f, y0, dt, n, method = 'rk4') {
  const out = [y0.slice()]; let y = y0.slice(), t = 0;
  for (let i = 0; i < n; i++) {
    if (method === 'euler') { const k = f(t, y); y = y.map((v, j) => v + dt * k[j]); }
    else { const k1 = f(t, y), k2 = f(t + dt / 2, y.map((v, j) => v + (dt / 2) * k1[j])), k3 = f(t + dt / 2, y.map((v, j) => v + (dt / 2) * k2[j])), k4 = f(t + dt, y.map((v, j) => v + dt * k3[j])); y = y.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); }
    t += dt; out.push(y.slice());
  }
  return out;
}
// Dimensionless driven oscillator  x'' + 2ζ x' + x = cos(r t)   (time in 1/ωn, x in static deflection F0/k)
export function spring({ zeta, r, periods = 12, perPeriod = 60, method = 'rk4', free = false, x0 = 1 }) {
  const dt = TAU / perPeriod, n = periods * perPeriod;
  const f = (t, y) => [y[1], (free ? 0 : Math.cos(r * t)) - 2 * zeta * y[1] - y[0]];
  const s = integrate(f, [free ? x0 : 0, 0], dt, n, method);
  return s.map((y, i) => ({ t: i * dt, x: y[0], v: y[1] }));
}
export const resonance = (zeta, r) => 1 / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
export const energy = (s) => 0.5 * s.v * s.v + 0.5 * s.x * s.x;
// Projectile with quadratic drag: a = -g ŷ - (g/vt²)|v| v
export function projectile({ v0, ang, vt = Infinity, g = 9.81, dt = 0.01, h0 = 0 }) {
  const a = (ang * Math.PI) / 180, k = isFinite(vt) ? g / (vt * vt) : 0;
  const f = (t, y) => { const sp = Math.hypot(y[2], y[3]); return [y[2], y[3], -k * sp * y[2], -g - k * sp * y[3]]; };
  let y = [0, h0, v0 * Math.cos(a), v0 * Math.sin(a)], t = 0; const pts = [[0, h0]]; let maxh = h0;
  for (let i = 0; i < 200000; i++) {
    y = integrate(f, y, dt, 1)[1]; t += dt; pts.push([y[0], Math.max(0, y[1])]); maxh = Math.max(maxh, y[1]);
    if (y[1] < 0) { const p = pts[pts.length - 2], u = p[1] / (p[1] - y[1]); pts[pts.length - 1] = [p[0] + u * (y[0] - p[0]), 0]; return { pts, range: pts[pts.length - 1][0], tof: t, maxh }; }
  }
  return { pts, range: y[0], tof: t, maxh };
}

// ============ 2. Exponential ============
export const halfLife = (lambda) => Math.LN2 / lambda;
export const dosingPeak = (lambda, interval) => 1 / (1 - Math.exp(-lambda * interval));
export const dosingConc = (t, lambda, interval, nDoses) => { let c = 0; for (let k = 0; k < nDoses; k++) { const tk = k * interval; if (tk <= t) c += Math.exp(-lambda * (t - tk)); } return c; };
export const logistic = (t, r, K, N0) => K / (1 + ((K - N0) / N0) * Math.exp(-r * t));

// ============ 3. Heat: u_t = u_xx on [0,1], dimensionless time θ = αt/L² ============
export const heatInit = {
  gauss: (nx, w = 0.08) => Float64Array.from({ length: nx }, (_, i) => Math.exp(-(((i / (nx - 1)) - 0.5) ** 2) / (2 * w * w))),
  step: (nx) => Float64Array.from({ length: nx }, (_, i) => (i / (nx - 1) < 0.5 ? 1 : 0)),
  sine: (nx, n = 1) => Float64Array.from({ length: nx }, (_, i) => Math.sin(n * Math.PI * (i / (nx - 1)))),
  cold: (nx) => new Float64Array(nx),
  noisy: (nx, seed = 7) => { let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; return Float64Array.from({ length: nx }, (_, i) => { const x = i / (nx - 1); return (x > 0.3 && x < 0.7 ? 1 : 0) + 0.35 * (rnd() - 0.5) * 2; }); },
};
export function heat1d({ init, theta, r = 0.4, bc = 'dirichlet', left = 0, right = 0 }) {
  const nx = init.length, dx = 1 / (nx - 1), dth = r * dx * dx, steps = Math.max(0, Math.round(theta / dth));
  let u = Float64Array.from(init), w = new Float64Array(nx), unstable = false;
  if (bc === 'dirichlet') { u[0] = left; u[nx - 1] = right; }
  for (let s = 0; s < steps; s++) {
    for (let i = 1; i < nx - 1; i++) w[i] = u[i] + r * (u[i + 1] - 2 * u[i] + u[i - 1]);
    if (bc === 'neumann') { w[0] = u[0] + 2 * r * (u[1] - u[0]); w[nx - 1] = u[nx - 1] + 2 * r * (u[nx - 2] - u[nx - 1]); } else { w[0] = left; w[nx - 1] = right; }
    [u, w] = [w, u];
    if (Math.abs(u[nx >> 1]) > BIG) { unstable = true; break; }
  }
  if (unstable) u = u.map((v) => clamp(v, -50, 50));
  return { u, theta: steps * dth, unstable };
}

// ============ 4. Wave: u_tt = u_xx on [0,1] (c = 1, time unit L/c) ============
// bc: 'ff' fixed-fixed, 'fx' fixed(left)-free(right), 'xx' free-free
export function wave1d({ init, s = 0.95, bc = 'ff', tEnd = 4, rows = 240 }) {
  const nx = init.length, dx = 1 / (nx - 1), dt = s * dx, steps = Math.round(tEnd / dt), every = Math.max(1, Math.floor(steps / rows));
  const leftFixed = bc === 'ff' || bc === 'fx', rightFixed = bc === 'ff';
  let u = Float64Array.from(init), up = new Float64Array(nx), un = new Float64Array(nx), unstable = false; const s2 = s * s;
  const lap = (a, i) => (i === 0 ? 2 * (a[1] - a[0]) : i === nx - 1 ? 2 * (a[nx - 2] - a[nx - 1]) : a[i + 1] - 2 * a[i] + a[i - 1]);
  if (leftFixed) u[0] = 0; if (rightFixed) u[nx - 1] = 0;
  for (let i = 0; i < nx; i++) up[i] = u[i] + 0.5 * s2 * lap(u, i);   // u(dt) for zero initial velocity
  if (leftFixed) up[0] = 0; if (rightFixed) up[nx - 1] = 0;
  [u, up] = [up, u]; // u = u(dt), up = u(0)
  const frames = [Float32Array.from(up)], times = [0];
  for (let n = 1; n <= steps; n++) {
    for (let i = 0; i < nx; i++) un[i] = 2 * u[i] - up[i] + s2 * lap(u, i);
    if (leftFixed) un[0] = 0; if (rightFixed) un[nx - 1] = 0;
    [up, u, un] = [u, un, up];
    if (n % every === 0) { frames.push(Float32Array.from(u)); times.push(n * dt); }
    if (Math.abs(u[nx >> 1]) > BIG) { unstable = true; break; }
  }
  return { frames: unstable ? frames.map((f) => f.map((v) => clamp(v, -5, 5))) : frames, times, unstable, dt };
}
export const waveInit = {
  pluck: (nx, p = 0.3) => Float64Array.from({ length: nx }, (_, i) => { const x = i / (nx - 1); return x < p ? x / p : (1 - x) / (1 - p); }),
  pulse: (nx, x0 = 0.5, w = 0.04) => Float64Array.from({ length: nx }, (_, i) => Math.exp(-(((i / (nx - 1)) - x0) ** 2) / (2 * w * w))),
  mode: (nx, n = 1) => Float64Array.from({ length: nx }, (_, i) => Math.sin(n * Math.PI * (i / (nx - 1)))),
};
export function sineCoeffs(u, N = 12) { // a_n = 2 ∫ u sin(nπx) dx
  const nx = u.length, dx = 1 / (nx - 1);
  return Array.from({ length: N }, (_, k) => { let s = 0; for (let i = 0; i < nx; i++) { const w = i === 0 || i === nx - 1 ? 0.5 : 1; s += w * u[i] * Math.sin((k + 1) * Math.PI * i * dx); } return 2 * s * dx; });
}
export const modeFreq = (bc, n, c, L) => (bc === 'fx' ? ((2 * n - 1) * c) / (4 * L) : (n * c) / (2 * L));

// ============ 5. Laplace / Poisson: ∇²φ = -ρ on a grid (h = 1) ============
// type: 0 free, 1 fixed (Dirichlet), 2 wall (excluded; acts as Neumann). Cells outside the grid are Neumann too.
export function laplace2d({ nx, ny, type, val, rho, method = 'sor', omega = 1.9, maxIter = 2000, tol = 1e-5 }) {
  const phi = Float64Array.from(val), N = nx * ny, nxt = new Float64Array(N);
  const at = (a, i, j, ci) => (i < 0 || i >= nx || j < 0 || j >= ny || type[j * nx + i] === 2 ? a[ci] : a[j * nx + i]);
  let iters = 0, res = Infinity;
  for (; iters < maxIter && res > tol; iters++) {
    res = 0;
    if (method === 'jacobi') {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i; if (type[c] !== 0) { nxt[c] = phi[c]; continue; }
        const v = 0.25 * (at(phi, i - 1, j, c) + at(phi, i + 1, j, c) + at(phi, i, j - 1, c) + at(phi, i, j + 1, c) + (rho ? rho[c] : 0)); res = Math.max(res, Math.abs(v - phi[c])); nxt[c] = v; }
      phi.set(nxt);
    } else {
      const w = method === 'sor' ? omega : 1;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i; if (type[c] !== 0) continue;
        const g = 0.25 * (at(phi, i - 1, j, c) + at(phi, i + 1, j, c) + at(phi, i, j - 1, c) + at(phi, i, j + 1, c) + (rho ? rho[c] : 0)), v = phi[c] + w * (g - phi[c]); res = Math.max(res, Math.abs(v - phi[c])); phi[c] = v; }
    }
  }
  return { phi, iters, residual: res };
}
export function gradMag(phi, nx, ny, type) {
  const m = new Float64Array(nx * ny), gx = new Float64Array(nx * ny), gy = new Float64Array(nx * ny);
  for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const c = j * nx + i; if (type[c] === 2) continue; gx[c] = -(phi[c + 1] - phi[c - 1]) / 2; gy[c] = -(phi[c + nx] - phi[c - nx]) / 2; m[c] = Math.hypot(gx[c], gy[c]); }
  return { m, gx, gy };
}

// ============ 6. Maxwell: 1D FDTD (E_z, H_y), c = 1, dx = 1, dt = 1/2 ============
export class FDTD {
  constructor({ nx = 500, eps, sigma, src }) {
    this.nx = nx; this.E = new Float64Array(nx); this.H = new Float64Array(nx - 1); this.n = 0; this.src = src;
    this.ca = new Float64Array(nx); this.cb = new Float64Array(nx); const dt = 0.5;
    for (let i = 0; i < nx; i++) { const e = eps[i], s = sigma ? sigma[i] : 0, k = (s * dt) / (2 * e); this.ca[i] = (1 - k) / (1 + k); this.cb[i] = dt / e / (1 + k); }
    this.l1 = 0; this.r1 = 0; this.probe = [];
  }
  step() {
    const { nx, E, H, ca, cb, src } = this, dt = 0.5;
    for (let i = 0; i < nx - 1; i++) H[i] += dt * (E[i + 1] - E[i]);
    const a1 = E[1], b1 = E[nx - 2];
    for (let i = 1; i < nx - 1; i++) E[i] = ca[i] * E[i] + cb[i] * (H[i] - H[i - 1]);
    E[0] = this.l1; E[nx - 1] = this.r1; this.l1 = a1; this.r1 = b1; // absorbing ends: E0(n+1) = E1(n-1) (a wave covers one cell in 2 steps at S = 1/2; valid in vacuum)
    const t = this.n;
    if (src.type === 'pulse') E[src.x] += Math.exp(-(((t - src.t0) / src.spread) ** 2));
    else E[src.x] += Math.sin(src.omega * t * dt) * (1 - Math.exp(-t / 60));
    this.n++; if (src.probe != null) this.probe.push(E[src.probe]);
  }
  run(k) { for (let i = 0; i < k; i++) this.step(); }
}
export const fresnelR = (n1, n2) => (n1 - n2) / (n1 + n2);
export const cLight = (mu0 = 1.25663706212e-6, eps0 = 8.8541878128e-12) => 1 / Math.sqrt(mu0 * eps0);
export const skinDepth = (f, sigma, mur = 1) => 1 / Math.sqrt(Math.PI * f * mur * 4e-7 * Math.PI * sigma);
// Single thin film, normal incidence: R = |r|², n0 ambient, n1 film, n2 substrate, d thickness, lam wavelength
export function thinFilmR(lam, n0, n1, n2, d) {
  const r01 = (n0 - n1) / (n0 + n1), r12 = (n1 - n2) / (n1 + n2), del = (TAU * n1 * d) / lam, c = Math.cos(2 * del), s = Math.sin(2 * del);
  const nr = r01 + r12 * c, ni = r12 * s, dr = 1 + r01 * r12 * c, di = r01 * r12 * s;
  return (nr * nr + ni * ni) / (dr * dr + di * di);
}

// ============ 7. Schrödinger (ħ = m = 1): split-step Fourier ============
export function fft(re, im, inv = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const h = len >> 1, base = ((inv ? 1 : -1) * TAU) / len;
    for (let i = 0; i < n; i += len) for (let j = 0; j < h; j++) {
      const a = i + j, b = a + h, cr = Math.cos(base * j), ci = Math.sin(base * j), tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
      re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
export class TDSE {
  constructor({ N = 512, L = 120, V, dt = 0.02, x0 = -30, sigma = 4, k0 = 2 }) {
    this.N = N; this.L = L; this.dx = L / N; this.dt = dt; this.x = Float64Array.from({ length: N }, (_, i) => -L / 2 + i * this.dx);
    this.V = Float64Array.from(this.x, (x) => V(x)); this.k = Float64Array.from({ length: N }, (_, j) => (TAU / L) * (j <= N / 2 ? j : j - N));
    this.re = new Float64Array(N); this.im = new Float64Array(N); this.t = 0;
    const A = Math.pow(2 * Math.PI * sigma * sigma, -0.25);
    for (let i = 0; i < N; i++) { const g = A * Math.exp(-((this.x[i] - x0) ** 2) / (4 * sigma * sigma)); this.re[i] = g * Math.cos(k0 * this.x[i]); this.im[i] = g * Math.sin(k0 * this.x[i]); }
    this.hv = Array.from(this.V, (v) => [Math.cos((v * dt) / 2), -Math.sin((v * dt) / 2)]); this.kk = Array.from(this.k, (k) => [Math.cos((k * k * dt) / 2), -Math.sin((k * k * dt) / 2)]);
    this.hvI = this.V.map((v) => Math.exp((-v * dt) / 2)); this.kkI = this.k.map((k) => Math.exp((-k * k * dt) / 2));
  }
  step(imag = false) {
    const { N, re, im } = this;
    if (!imag) {
      for (let i = 0; i < N; i++) { const [c, s] = this.hv[i], a = re[i], b = im[i]; re[i] = a * c - b * s; im[i] = a * s + b * c; }
      fft(re, im); for (let i = 0; i < N; i++) { const [c, s] = this.kk[i], a = re[i], b = im[i]; re[i] = a * c - b * s; im[i] = a * s + b * c; } fft(re, im, true);
      for (let i = 0; i < N; i++) { const [c, s] = this.hv[i], a = re[i], b = im[i]; re[i] = a * c - b * s; im[i] = a * s + b * c; }
    } else {
      for (let i = 0; i < N; i++) { re[i] *= this.hvI[i]; im[i] *= this.hvI[i]; }
      fft(re, im); for (let i = 0; i < N; i++) { re[i] *= this.kkI[i]; im[i] *= this.kkI[i]; } fft(re, im, true);
      for (let i = 0; i < N; i++) { re[i] *= this.hvI[i]; im[i] *= this.hvI[i]; }
      const nr = Math.sqrt(this.norm()); for (let i = 0; i < N; i++) { re[i] /= nr; im[i] /= nr; }
    }
    this.t += this.dt;
  }
  run(n, imag = false) { for (let i = 0; i < n; i++) this.step(imag); }
  prob(i) { return this.re[i] ** 2 + this.im[i] ** 2; }
  norm() { let s = 0; for (let i = 0; i < this.N; i++) s += this.prob(i); return s * this.dx; }
  meanX() { let s = 0; for (let i = 0; i < this.N; i++) s += this.x[i] * this.prob(i); return (s * this.dx) / this.norm(); }
  widthX() { const m = this.meanX(); let s = 0; for (let i = 0; i < this.N; i++) s += (this.x[i] - m) ** 2 * this.prob(i); return Math.sqrt((s * this.dx) / this.norm()); }
  momentum() { const r = Float64Array.from(this.re), i2 = Float64Array.from(this.im); fft(r, i2); let s = 0, k1 = 0, k2 = 0; for (let j = 0; j < this.N; j++) { const p = r[j] ** 2 + i2[j] ** 2; s += p; k1 += this.k[j] * p; k2 += this.k[j] ** 2 * p; } return { k: k1 / s, k2: k2 / s }; }
  energy() { let v = 0; for (let i = 0; i < this.N; i++) v += this.V[i] * this.prob(i); return 0.5 * this.momentum().k2 + (v * this.dx) / this.norm(); }
  probIn(a, b) { let s = 0; for (let i = 0; i < this.N; i++) if (this.x[i] >= a && this.x[i] <= b) s += this.prob(i); return (s * this.dx) / this.norm(); }
}
export const barrier = (V0, w) => (x) => (Math.abs(x) <= w / 2 ? V0 : 0);
export const harmonic = (om) => (x) => 0.5 * om * om * x * x;
export function tunnelT(E, V0, w) { if (E >= V0) return 1; const k = Math.sqrt(2 * (V0 - E)), s = Math.sinh(k * w); return 1 / (1 + (V0 * V0 * s * s) / (4 * E * (V0 - E))); }

// effective width of a sampled barrier (number of grid points where V > 0) × dx, to compare with the plane-wave formula
export const effWidth = (sim) => sim.V.reduce((n, v) => n + (v > 0 ? 1 : 0), 0) * sim.dx;
