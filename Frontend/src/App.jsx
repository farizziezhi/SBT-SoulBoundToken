import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { useContract } from './hooks/useContract';
import Dashboard from './pages/Dashboard';
import Mint from './pages/Mint';
import Verify from './pages/Verify';

function App() {
  const { connectWallet, account, contract, error, getReadOnlyContract } = useContract();

  return (
    <div className="min-h-screen flex flex-col bg-noir">
      <Navbar account={account} connectWallet={connectWallet} />

      {error && (
        <div className="mx-6 mt-6 max-w-6xl md:mx-auto w-full bg-noir-card border border-revoked/30 p-4 flex items-center gap-4 animate-fade-up">
          <div className="w-1 self-stretch bg-revoked rounded-full"></div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-revoked">{error}</p>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16">
        <Routes>
          <Route path="/" element={<Dashboard account={account} contract={contract} />} />
          <Route path="/mint" element={<Mint account={account} contract={contract} />} />
          <Route path="/verify" element={<Verify getReadOnlyContract={getReadOnlyContract} />} />
        </Routes>
      </main>

      <footer className="border-t border-zinc-800/50 py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-600">
            Soulbound Diploma Protocol
          </p>
          <div className="flex items-center gap-3">
            <span className="w-1 h-1 bg-gold/40 rounded-full"></span>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-700">
              Academic Verification Layer // 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
