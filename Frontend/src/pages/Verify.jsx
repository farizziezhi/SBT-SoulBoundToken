import { useState } from 'react';
import { Search, Loader2, Award, XCircle, CheckCircle } from 'lucide-react';

export default function Verify({ getReadOnlyContract }) {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, found, not-found
  const [tokens, setTokens] = useState([]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!address) return;
    
    setStatus('loading');
    try {
      const contract = getReadOnlyContract();
      if (!contract) {
        throw new Error("MetaMask is required to query the network (even for free reads).");
      }
      
      const tokenIds = await contract.getStudentCertificates(address);
      
      if (tokenIds.length === 0) {
        setStatus('not-found');
        setTokens([]);
        return;
      }

      const tokenData = await Promise.all(
        tokenIds.map(async (id) => {
          const locked = await contract.locked(id);
          const uri = await contract.tokenURI(id);
          return { id: id.toString(), locked, uri };
        })
      );
      
      setTokens(tokenData);
      setStatus('found');
    } catch (err) {
      console.error(err);
      setStatus('not-found');
    }
  };

  return (
    <div className="space-y-12 animate-fade-in">
      <header className="border-b border-slate-900 pb-8 text-center md:text-left">
        <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tight mb-4 text-slate-900">
          Public Verification
        </h1>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500 max-w-2xl">
          Cryptographically verify academic credentials attached to any Ethereum address. No gas required.
        </p>
      </header>

      <form onSubmit={handleVerify} className="flex flex-col md:flex-row items-end gap-4">
        <div className="w-full space-y-2">
          <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold">
            Target Wallet Address
          </label>
          <input 
            type="text" 
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border-b-2 border-slate-900 bg-white p-4 font-mono text-lg focus:outline-none focus:border-institutional transition-colors"
          />
        </div>
        <button 
          type="submit"
          className="bg-slate-900 text-white p-4 hover:bg-institutional transition-colors shrink-0"
        >
          {status === 'loading' ? <Loader2 className="animate-spin" /> : <Search />}
        </button>
      </form>

      {/* Results Region */}
      <div className="pt-8">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="font-mono text-xs uppercase tracking-widest">Querying Global State...</p>
          </div>
        )}

        {status === 'not-found' && (
          <div className="border border-slate-200 bg-white p-12 text-center shadow-sm">
            <XCircle size={48} className="text-red-500/50 mx-auto mb-6" />
            <h3 className="font-serif text-2xl font-bold mb-2">No Credentials Found</h3>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-slate-500">
              The requested address holds zero valid soulbound tokens.
            </p>
          </div>
        )}

        {status === 'found' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 bg-institutional/10 text-institutional p-4 border border-institutional/20">
               <CheckCircle size={20} />
               <span className="font-mono text-[10px] uppercase tracking-widest font-bold">
                 Verified: {tokens.length} Authentic Record(s) Found
               </span>
            </div>

            {tokens.map((token) => (
              <div key={token.id} className="border border-slate-200 bg-white p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <Award className="text-institutional" size={24} />
                  </div>
                  <div>
                    <h4 className="font-serif text-2xl font-bold mb-1">Academic Certificate</h4>
                    <span className="inline-block bg-slate-900 text-white font-mono text-[9px] uppercase tracking-widest px-2 py-1">
                      Soulbound: {token.locked ? "True" : "False"}
                    </span>
                  </div>
                </div>
                
                <div className="w-full md:w-auto flex flex-col gap-2 font-mono border-l-0 md:border-l border-slate-200 pl-0 md:pl-8">
                  <div className="text-xs">
                    <span className="text-slate-400 mr-2 uppercase text-[9px] tracking-widest">ID:</span>
                    <span className="font-bold">#{token.id}</span>
                  </div>
                  <div className="text-xs truncate max-w-[200px]">
                    <span className="text-slate-400 mr-2 uppercase text-[9px] tracking-widest">URI:</span>
                    <a href={token.uri} target="_blank" rel="noreferrer" className="text-institutional hover:underline">
                      {token.uri.substring(0, 20)}...
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
