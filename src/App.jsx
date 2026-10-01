import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';

const toastOptions = {
  duration: 3500,
  style: {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-lg)',
    fontSize: '0.875rem',
    padding: '10px 14px',
  },
  success: { iconTheme: { primary: '#C6F432', secondary: '#111318' } },
  error: { iconTheme: { primary: '#F87171', secondary: '#111318' }, duration: 5000 },
};

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={toastOptions} containerStyle={{ zIndex: 100 }} />
    </>
  );
}
