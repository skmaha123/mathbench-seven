# MathBench Seven: the "Magnificent Seven" equations, from fundamentals to applications

An interactive digital twin (Vite + React, no backend, no chart library) for the seven equations that sit under most of science and engineering. Every equation tab has the same four parts, so students always know where they are:

1. **Fundamentals**: the equation, what each term means, what kind of equation it is, what must be supplied (initial/boundary conditions) and how it is solved.
2. **A live solver** you can change: the real numerical method runs in your browser.
3. **Applications**: one-click real cases tagged by branch (Aerospace, Mechanical, Biology, CSE, ECE, EE, Civil) that load realistic parameters.
4. **Connections**: buttons that jump to the equations it is related to, plus "check yourself" questions with answers.

The first tab, **The Common Thread**, shows how the seven are related: a map of connections, the complex exponential plane (e^(λt)) that every equation lives in, the plane-wave table ω(k) that turns each PDE into algebra, and three live bridges (Newton → wave, heat → exponentials, Maxwell → c).

| # | Equation | Live solver | Applications loaded by branch |
|---|---|---|---|
| 1 | Newton: m x″ = F | RK4/Euler, drag, resonance curve, phase portrait | car suspension, footbridge, tall building, MEMS cantilever, UAV package drop, football |
| 2 | Exponential: N′ = −λN | decay, growth + logistic, repeated dosing | C-14 dating, RC circuit, air pressure, cooling, drug dosing, bacteria, Moore’s law |
| 3 | Heat: u_t = α u_xx | explicit finite differences; stability limit r ≤ ½ | concrete wall, copper heat spreader, brake disc, tissue, insulation tile, Gaussian blur |
| 4 | Wave: u_tt = c² u_xx | leapfrog; CFL ≤ 1; harmonics; space–time image | guitar string, soil layer, transmission line, ultrasound, steel rod |
| 5 | Laplace/Poisson: ∇²φ = −ρ | Jacobi / Gauss–Seidel / SOR relaxation on a grid | capacitor, sharp tip, electrode, heated plate, dam seepage |
| 6 | Maxwell | 1D FDTD (E, H curl updates), Fresnel, thin films, skin depth | glass, PCB, AR coating, radome, shielding, submarine radio |
| 7 | Schrödinger | split-step Fourier, tunnelling, Ehrenfest, imaginary time | thin-oxide tunnelling, enzyme H-tunnelling, vibrating bond, spreading packet, ground-state search |

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 20 checks of the solvers against exact solutions
npm run build      # static site in dist/
```

## Publish on GitHub Pages
Push to `main`, then Settings → Pages → Source: *GitHub Actions*. The included workflow runs the tests, builds and deploys. `vite.config.js` uses `base: './'`, so any sub-path works.

## What the 20 tests prove
Newton: RK4 conserves energy (Euler does not); driven amplitude = 1/√((1−r²)²+(2ζr)²); vacuum range = v₀² sin 2θ/g; terminal velocity. Exponential: half-life, dosing steady state, logistic limit. Heat: mode decay e^(−n²π²θ), heat conservation, linear steady state, instability for r > ½. Wave: standing-mode periods, d’Alembert splitting at ±c, harmonic content (no even harmonics for a centre pluck), CFL blow-up. Laplace: linear potential, SOR ≫ Gauss–Seidel ≫ Jacobi, Poisson parabola, Jacobi = heat step with r = ¼. Maxwell: wave speed in vacuum/dielectric, reflection −0.333 vs Fresnel, c from μ₀ε₀, skin depth, anti-reflection coating. Schrödinger: FFT/Parseval, norm and energy conservation, free-packet spreading, tunnelling vs plane-wave formula, Ehrenfest, imaginary-time ground state.

## Honest simplifications (also shown on each tab)
- Mostly 1D (Laplace is 2D, with a coarse grid). One degree of freedom for Newton.
- Real-world parameters (diffusivities, wave speeds, tunnelling barriers, MRI-like values) are typical or illustrative; trends are reliable, third digits are not.
- The Maxwell absorbing boundary is exact only in vacuum, so slabs end before the right edge.
- The Schrödinger simulation uses ħ = m = 1; the electron mapping (1 length = 1 nm, 1 energy = 0.076 eV) is stated on the tab.
- A packet’s tunnelling probability is slightly above the plane-wave formula at its mean energy (it contains a spread of energies); the tab explains this and lets you narrow the spread.

## Suggested 90-minute session
Open **Common Thread** (10 min): click λ, find where your own branch’s problem sits. Then split by branch: each group opens the matching application card in 2–3 tabs (20 min), writes a prediction before moving a slider, and answers the check questions. Finish with the "Spot the equation" list (10 min) and one group per equation presents the link it found to another equation (20 min).

## Extending
All numerics are in `src/lib/engines.js` (pure functions, tested). A new application is one entry in the `PRE` array of its tab; a new equation is one component plus one entry in `TABS` in `src/App.jsx`. Ideas: Navier–Stokes (1D Burgers), Black–Scholes (heat in disguise), Euler beam bending.
