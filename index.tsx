
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
      theme="dark"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'bg-zinc-900 border rounded-xl p-4 w-full max-w-sm shadow-[0_0_20px_rgba(255,204,0,0.15)] backdrop-blur-xl flex items-start gap-3',
          content: 'flex flex-col gap-1 flex-1 min-w-0',
          title: 'text-sm font-bold text-white leading-tight',
          description: 'text-xs text-zinc-400',
          success: 'border-[#FFCC00]/30',
          info: 'border-[#FFCC00]/30',
          default: 'border-[#FFCC00]/30',
          error: 'border-red-500/40',
          warning: 'border-amber-500/40',
          icon: 'text-[#FFCC00] mt-0.5 shrink-0',
        },
      }}
    />
  </React.StrictMode>
);
