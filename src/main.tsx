import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fraunces with only the optical-size and weight axes registered, which pins
// SOFT and WONK to zero — the quirky, dated character comes from those two.
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/inter/opsz.css';
import '@fontsource/jetbrains-mono/400.css';

// Tokens first: custom properties only, so load order does not fight Tailwind's
// preflight. Everything else is inside Tailwind's own layers.
import './styles/tokens.css';
import './index.css';
import './styles/editorial.css';

import App from './App';
import { resumeSimulation } from './sandbox';
import { bootSimulationFromUrl } from './tour/boot';

/**
 * A reload in the middle of a tour lands back in the simulation it was in, and
 * a `?tour=` link starts one before anything renders.
 *
 * Both run before the first render: the simulation bar is then part of the
 * first paint rather than something that pushes the page down a moment later,
 * and no screen gets to issue a real read in the gap.
 */
if (!bootSimulationFromUrl()) void resumeSimulation();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
