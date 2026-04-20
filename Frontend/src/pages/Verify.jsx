import { useState } from 'react';
import { Search, Loader2, Award, XCircle, CheckCircle, Lock, ExternalLink } from 'lucide-react';

export default function Verify({ getReadOnlyContract }) {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('idle');
  const [tokens, setTokens] = useState([]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!address) return;

    setStatus('loading');
    try {
      const contract = getReadOnlyContract();
      if (!contract) {
        throw new Error('MetaMask is required to query the network.');
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
    <div className="space-y-14">
      {/* Header */}
      <header className="animate-fade-up">
        <h1 className="font-serif text-5xl md:text-7xl italic text-zinc-100 tracking-tight mb-3 scan-line">
          Public Verification
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-6 max-w-xl leading-relaxed">
          Cryptographically verify academic credentials attached to any Ethereum address. Read-only — no gas required.
        </p>
      </header>

      {/* Search Bar */}
      <form onSubmit={handleVerify} className="flex items-end gap-3 animate-fade-up-delayed">
        <div className="flex-1 space-y-3">
          <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
            Target Wallet Address
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input-classified !text-lg !py-5"
          />
        </div>
        <button
          type="submit"
          className="bg-gold text-noir p-5 hover:shadow-[0_0_24px_rgba(212,168,83,0.3)] transition-all shrink-0"
        >
          {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
        </button>
      </form>

      {/* Results */}
      <div>
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
            <Loader2 className="animate-spin text-gold mb-4" size={28} />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Querying global state...
            </p>
          </div>
        )}

        {status === 'not-found' && (
          <div className="card-vault p-14 text-center animate-fade-up">
            <XCircle size={40} className="text-revoked/30 mx-auto mb-6" />
            <h3 className="font-serif text-2xl italic text-zinc-400 mb-3">No Credentials Found</h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
              The queried address holds zero valid soulbound tokens on this contract.
            </p>
          </div>
        )}

        {status === 'found' && (
          <div className="space-y-6 animate-fade-up">
            {/* Verified Banner */}
            <div className="flex items-center gap-3 bg-verified/5 border border-verified/20 p-4">
              <CheckCircle size={16} className="text-verified" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-verified">
                Verified: {tokens.length} Authentic Record{tokens.length > 1 ? 's' : ''} Found
              </span>
            </div>

            {/* Result Cards */}
            {tokens.map((token, i) => (
              <div
                key={token.id}
                className={`card-vault p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 stagger-${i + 1}`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-noir-elevated border border-zinc-800 flex items-center justify-center shrink-0">
                    <Award className="text-gold" size={22} />
                  </div>
                  <div>
                    <h4 className="font-serif text-xl italic text-zinc-200 mb-1.5">Academic Certificate</h4>
                    <div className="flex items-center gap-2">
                      <Lock size={9} className="text-gold" />
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold font-bold">
                        Soulbound: {token.locked ? 'True' : 'False'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col gap-3 font-mono md:border-l border-zinc-800 md:pl-8">
                  <div className="text-xs">
                    <span className="text-zinc-600 uppercase text-[9px] tracking-[0.15em] mr-2">ID:</span>
                    <span className="text-zinc-300 font-bold">#{token.id}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-zinc-600 uppercase text-[9px] tracking-[0.15em] mr-2">URI:</span>
                    <a
                      href={token.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold hover:text-gold-dim transition-colors inline-flex items-center gap-1"
                    >
                      {token.uri.length > 24 ? token.uri.substring(0, 24) + '...' : token.uri}
                      <ExternalLink size={10} />
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
