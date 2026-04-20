import { useEffect, useState } from 'react';
import { Award, Lock, ExternalLink, ShieldOff } from 'lucide-react';

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

  /* ── Auth Gate ── */
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center animate-fade-up">
        <div className="w-20 h-20 border border-zinc-800 flex items-center justify-center mb-8">
          <ShieldOff size={28} className="text-zinc-600" />
        </div>
        <h2 className="font-serif text-4xl italic text-zinc-300 mb-4">Authentication Required</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 max-w-sm leading-relaxed">
          Connect your MetaMask wallet to access academic records sealed on the Ethereum blockchain.
        </p>
      </div>
    );
  }

  /* ── Main View ── */
  return (
    <div className="space-y-14">
      {/* Header with scan-line */}
      <header className="animate-fade-up">
        <h1 className="font-serif text-5xl md:text-7xl italic text-zinc-100 tracking-tight mb-3 scan-line">
          Your Immutable Records
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mt-6">
          Credential Registry — Verified on Chain
        </p>
      </header>

      {/* Content */}
      {loading ? (
        <div className="card-vault p-10 animate-fade-up">
          <div className="flex items-center gap-4">
            <span className="w-2 h-2 bg-gold rounded-full animate-glow-pulse"></span>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
              Synchronizing with ledger...
            </p>
          </div>
        </div>
      ) : tokens.length === 0 ? (
        <div className="card-vault p-16 text-center animate-fade-up">
          <Award size={32} className="text-zinc-700 mx-auto mb-6" />
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
            No credentials found for this address.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tokens.map((token, i) => (
            <div
              key={token.id}
              className={`card-vault p-8 animate-fade-up stagger-${i + 1}`}
            >
              {/* Soulbound badge */}
              {token.locked && (
                <div className="flex items-center gap-2 mb-6">
                  <Lock size={10} className="text-gold" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold font-bold">
                    Soulbound
                  </span>
                </div>
              )}

              <Award size={28} className="text-gold mb-5" />
              <h3 className="font-serif text-2xl italic text-zinc-200 mb-6">Degree Certificate</h3>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex flex-col border-t border-zinc-800 pt-4">
                  <span className="text-zinc-600 uppercase tracking-[0.2em] text-[9px] mb-1">Token ID</span>
                  <span className="text-zinc-200 font-bold">#{token.id}</span>
                </div>

                <div className="flex flex-col border-t border-zinc-800 pt-4">
                  <span className="text-zinc-600 uppercase tracking-[0.2em] text-[9px] mb-1">Metadata URI</span>
                  <a
                    href={token.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-gold hover:text-gold-dim transition-colors break-all text-[11px]"
                  >
                    {token.uri.length > 32 ? token.uri.substring(0, 32) + '...' : token.uri}
                    <ExternalLink size={11} />
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
