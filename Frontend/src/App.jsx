import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { useContract } from './hooks/useContract';
import Dashboard from './pages/Dashboard';
import Mint from './pages/Mint';
import Verify from './pages/Verify';

function App() {
  const { connectWallet, account, contract, error, getReadOnlyContract } = useContract();

  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-body">
      <Navbar account={account} connectWallet={connectWallet} />

      {/* Marquee ticker for brutalist flair */}
      <div className="w-full overflow-hidden border-b-2 border-black bg-black text-white py-1">
        <div className="animate-marquee whitespace-nowrap font-mono text-[10px] uppercase tracking-widest font-bold">
          <span className="mx-4">SBT PROTOCOL V2 ACTIVE</span>
          <span className="mx-4">///</span>
          <span className="mx-4">IMMUTABLE ACADEMIC RECORDS</span>
          <span className="mx-4">///</span>
          <span className="mx-4">ON-CHAIN VERIFICATION</span>
          <span className="mx-4">///</span>
          <span className="mx-4">NO GAS REQUIRED FOR READS</span>
          <span className="mx-4">///</span>
          <span className="mx-4">SBT PROTOCOL V2 ACTIVE</span>
          <span className="mx-4">///</span>
          <span className="mx-4">IMMUTABLE ACADEMIC RECORDS</span>
          <span className="mx-4">///</span>
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-8 max-w-6xl w-[calc(100%-2rem)] brutal-card border-error !shadow-[4px_4px_0px_#ff0000] p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-3 h-3 bg-error shrink-0"></div>
          <p className="font-mono text-xs text-error font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}

      {/* Main structural grid */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-20">
        <Routes>
          <Route path="/" element={<Dashboard account={account} contract={contract} />} />
          <Route path="/mint" element={<Mint account={account} contract={contract} />} />
          <Route path="/verify" element={<Verify getReadOnlyContract={getReadOnlyContract} />} />
        </Routes>
      </main>

      <footer className="mt-auto border-t-2 border-black bg-white">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between">
          <div className="p-6 md:p-8 border-b-2 md:border-b-0 md:border-r-2 border-black flex-1">
            <p className="font-display text-xl font-bold uppercase tracking-tighter">SBT Protocol</p>
            <p className="font-mono text-xs text-neutral-500 mt-2">Academic Verification Layer</p>
          </div>
          <div className="p-6 md:p-8 flex items-end justify-end">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest">© 2026 // ALL RIGHTS RESERVED</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
