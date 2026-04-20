import { useEffect, useState } from 'react';
import { Award, Lock, ExternalLink } from 'lucide-react';

export default function Dashboard({ account, contract }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account && contract) {
      fetchCertificates();
    }
  }, [account, contract]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const tokenIds = await contract.getStudentCertificates(account);
      // Determine if tokens are locked (EIP-5192) and fetch their URI
      const tokenData = await Promise.all(
        tokenIds.map(async (id) => {
          const locked = await contract.locked(id);
          const uri = await contract.tokenURI(id);
          return { id: id.toString(), locked, uri };
        })
      );
      setTokens(tokenData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] border border-slate-200 bg-white p-12 text-center">
        <Lock size={32} className="text-slate-300 mb-6" />
        <h2 className="font-serif text-3xl font-black mb-4">Authentication Required</h2>
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-slate-500 max-w-md">
          Please connect your MetaMask wallet to access your academic records stored on the blockchain.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in">
      <header className="border-b border-slate-900 pb-8">
        <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tight mb-4 text-slate-900">
          My Credentials
        </h1>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-institutional">
          Verified Immutable Records
        </p>
      </header>

      {loading ? (
        <div className="font-mono text-xs uppercase tracking-widest text-slate-400 p-8 border border-slate-200 animate-pulse">
          Synchronizing with Ledger...
        </div>
      ) : tokens.length === 0 ? (
        <div className="border border-slate-200 bg-white p-16 text-center shadow-sm">
          <p className="font-mono text-sm uppercase tracking-widest text-slate-500">
            No credentials found for this address.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tokens.map((token) => (
            <div key={token.id} className="relative group border border-slate-200 bg-white p-8 hover:border-slate-900 transition-colors">
              {/* Soulbound Badge */}
              {token.locked && (
                <div className="absolute top-0 right-0 bg-slate-900 text-white font-mono text-[9px] uppercase tracking-widest px-3 py-1 m-4 flex items-center gap-2">
                  <Lock size={10} />
                  Soulbound
                </div>
              )}
              
              <Award size={32} className="text-institutional mb-6" />
              
              <h3 className="font-serif text-2xl font-bold mb-2">Degree Certificate</h3>
              
              <div className="space-y-4 mt-8 font-mono text-xs">
                <div className="flex flex-col border-t border-slate-100 pt-4">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] mb-1">Token ID</span>
                  <span className="font-bold">#{token.id}</span>
                </div>
                
                <div className="flex flex-col border-t border-slate-100 pt-4">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] mb-1">Metadata Hash</span>
                  <a href={token.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-institutional hover:underline break-all">
                    {token.uri.substring(0, 30)}... <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
