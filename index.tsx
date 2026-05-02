
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary
      name="root"
      resetLabel="RELOAD"
      onReset={() => window.location.reload()}
    >
      <App />
    </ErrorBoundary>
    <Toaster
      position="bottom-right"
      toastOptions={{
        className: 'bg-zinc-900 border border-[#FFCC00]/50 text-white px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(255,204,0,0.15)] flex items-center gap-3 font-mono text-xs tracking-widest uppercase'
      }}
    />
  </React.StrictMode>
);
