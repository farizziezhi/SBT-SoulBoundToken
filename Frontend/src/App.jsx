import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { useContract } from './hooks/useContract';
import Dashboard from './pages/Dashboard';
import Mint from './pages/Mint';
import Verify from './pages/Verify';

function App() {
  const { connectWallet, account, contract, error, getReadOnlyContract } = useContract();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar account={account} connectWallet={connectWallet} />
      
      {error && (
        <div className="bg-slate-900 text-white p-4 mx-6 mt-6 max-w-6xl md:mx-auto w-full flex items-center gap-4">
          <div className="w-1.5 h-full bg-red-500 self-stretch"></div>
          <p className="font-mono text-xs uppercase tracking-widest">Error: {error}</p>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <Routes>
          <Route path="/" element={<Dashboard account={account} contract={contract} />} />
          <Route path="/mint" element={<Mint account={account} contract={contract} />} />
          <Route path="/verify" element={<Verify getReadOnlyContract={getReadOnlyContract} />} />
        </Routes>
      </main>
      
      <footer className="border-t border-slate-200 py-12 mt-12 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em]">
          <p>SOULBOUND DIPLOMA PROTOCOL</p>
          <p>ACADEMIC VERIFICATION LAYER // 2026</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
