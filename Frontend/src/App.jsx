import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { useContract } from './hooks/useContract';
import Dashboard from './pages/Dashboard';
import Mint from './pages/Mint';
import Verify from './pages/Verify';

function App() {
  const { connectWallet, account, contract, error, getReadOnlyContract } = useContract();

  return (
    <div className="min-h-screen flex flex-col bg-surface-low">
      <Navbar account={account} connectWallet={connectWallet} />

      {error && (
        <div className="mx-6 mt-6 max-w-6xl md:mx-auto w-full tonal-card bg-error-container/10 p-4 flex items-center gap-3 animate-fade-up">
          <div className="w-2 h-2 rounded-full bg-error shrink-0"></div>
          <p className="font-label text-sm text-error">{error}</p>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <Routes>
          <Route path="/" element={<Dashboard account={account} contract={contract} />} />
          <Route path="/mint" element={<Mint account={account} contract={contract} />} />
          <Route path="/verify" element={<Verify getReadOnlyContract={getReadOnlyContract} />} />
        </Routes>
      </main>

      <footer className="py-10 mt-auto bg-surface">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-label text-xs text-on-surface-variant">Soulbound Diploma Protocol</p>
          <p className="font-label text-xs text-outline">Academic Verification Layer · 2026</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
