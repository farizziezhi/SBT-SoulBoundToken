import { useState } from 'react';
import { Settings, CheckCircle2, UserPlus, Link as LinkIcon, AlertTriangle } from 'lucide-react';

export default function Mint({ account, contract }) {
  const [studentAddress, setStudentAddress] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleMint = async (e) => {
    e.preventDefault();
    if (!contract) return;
    
    setStatus('loading');
    setErrorMessage('');
    try {
      const tx = await contract.mintToStudent(studentAddress, tokenURI);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus('success');
      setStudentAddress('');
      setTokenURI('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      // Extract revert reason if possible
      setErrorMessage(err.reason || err.message || "Execution reverted. Ensure you have the ISSUER_ROLE.");
    }
  };

  if (!account) {
    return (
      <div className="border border-slate-200 bg-white p-12 text-center">
        <AlertTriangle size={32} className="text-institutional mb-6 mx-auto" />
        <h2 className="font-serif text-3xl font-black mb-4">Admin Access Only</h2>
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-slate-500">
          Connect your wallet to access the issuing protocol.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-fade-in">
      <header className="border-b border-slate-900 pb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl font-black tracking-tight mb-2 text-slate-900">
            Issue Credential
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-institutional">
            SBT Minting Protocol
          </p>
        </div>
        <Settings className="text-slate-200" size={48} />
      </header>

      <form onSubmit={handleMint} className="space-y-8 bg-white p-8 border border-slate-200 shadow-sm">
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold">
            <UserPlus size={12} /> Student Wallet Address
          </label>
          <input 
            type="text" 
            required
            placeholder="0x..."
            value={studentAddress}
            onChange={(e) => setStudentAddress(e.target.value)}
            className="w-full border-b border-slate-900 bg-slate-50 p-4 font-mono text-sm focus:outline-none focus:bg-institutional/5 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold">
            <LinkIcon size={12} /> IPFS Metadata URI
          </label>
          <input 
            type="text" 
            required
            placeholder="ipfs://..."
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            className="w-full border-b border-slate-900 bg-slate-50 p-4 font-mono text-sm focus:outline-none focus:bg-institutional/5 transition-colors"
          />
        </div>

        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="w-full bg-slate-900 text-white font-mono text-xs uppercase tracking-widest font-bold py-5 hover:bg-institutional transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Executing Sequence...' : 'Mint Soulbound Token'}
        </button>

        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 p-6 flex flex-col gap-4 mt-6">
            <div className="flex items-center gap-3 text-green-700 font-serif text-xl font-bold">
              <CheckCircle2 size={24} /> Credential Issued
            </div>
            <p className="font-mono text-[10px] text-green-800 uppercase tracking-widest break-all">
              Tx Hash: {txHash}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 p-6 flex flex-col gap-4 mt-6 text-red-700">
            <div className="flex items-center gap-3 font-serif text-xl font-bold">
              <AlertTriangle size={24} /> Issuance Failed
            </div>
            <p className="font-mono text-xs break-words">
              {errorMessage}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
