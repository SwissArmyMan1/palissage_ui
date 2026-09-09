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

import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
