import React from 'react';
import ReactDOM from 'react-dom/client';

// Self-hosted fonts (no runtime requests to Google).
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';

// Brand tokens (single source of truth) and app styles.
import '../../brand/tokens.css';
import './index.css';

import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
