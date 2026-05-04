import { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';

const CERT_TYPE_LABELS = {
  1: 'ORG. KEMAHASISWAAN',
  2: 'KOMPETISI AKADEMIK',
  3: 'PELATIHAN/WORKSHOP',
  4: 'PENGABDIAN MASYARAKAT',
  5: 'OLAHRAGA & SENI',
  6: 'SERTIFIKASI PROFESI',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  const date = new Date(Number(ts) * 1000);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export default function Verify({ getReadOnlyContract }) {
  const [address, setAddress]   = useState('');
  const [status, setStatus]     = useState('idle');
  const [certificates, setCertificates] = useState([]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!address) return;

    setStatus('loading');
    try {
      const contract = getReadOnlyContract();
      if (!contract) throw new Error('MetaMask required for network queries.');

      const tokenIds = await contract.getStudentCertificates(address);
      if (tokenIds.length === 0) {
        setStatus('not-found');
        setCertificates([]);
        return;
      }

      const results = await Promise.all(
        tokenIds.map(async (id) => {
          try {
            const [owner, certType, issuedAt, score, isRevoked, ipfsCID] =
              await contract.verifyCertificate(id);
            const uri = await contract.tokenURI(id);
            return {
              id: id.toString(), owner,
              certType: Number(certType), issuedAt: issuedAt.toString(),
              score: Number(score), isRevoked, ipfsCID, uri, exists: true,
            };
          } catch (_) {
            return { id: id.toString(), exists: false, isRevoked: true };
          }
        })
      );

      setCertificates(results);
      setStatus('found');
    } catch (err) {
      console.error(err);
      setStatus('not-found');
    }
  };

  const activeCerts  = certificates.filter(c => c.exists && !c.isRevoked);
  const revokedCerts = certificates.filter(c => !c.exists || c.isRevoked);

  return (
    <div className="space-y-12">
      <header className="animate-fade-in border-b-4 border-black pb-8">
        <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter mb-2">
          VERIFY
        </h1>
        <p className="font-mono text-sm font-bold tracking-widest text-neutral-500 uppercase">
          // ON-CHAIN CREDENTIAL RESOLUTION
        </p>
      </header>

      <form onSubmit={handleVerify} className="flex flex-col md:flex-row items-end gap-4 animate-fade-in">
        <div className="flex-1 w-full space-y-3">
          <label className="font-mono text-xs font-bold uppercase tracking-widest block">
            TARGET PUBLIC ADDRESS
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="brutal-input text-2xl md:text-4xl py-6 tracking-tight font-display font-bold"
          />
        </div>
        <button type="submit" className="brutal-btn w-full md:w-auto h-[88px] flex items-center justify-center shrink-0 px-12">
          {status === 'loading' ? (
            <span className="font-mono font-bold animate-pulse">[ SCANNING ]</span>
          ) : (
            <Search size={32} strokeWidth={3} />
          )}
        </button>
      </form>

      {status === 'not-found' && (
        <div className="brutal-card p-16 text-center animate-fade-in border-dashed border-4 border-error">
          <h3 className="font-display text-4xl font-black text-error mb-2 uppercase tracking-tighter">NULL RESULT</h3>
          <p className="font-mono text-sm font-bold uppercase tracking-widest text-error">
            ZERO VALID TOKENS LOCATED AT THIS ADDRESS.
          </p>
        </div>
      )}

      {status === 'found' && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-black text-white p-4 font-mono text-sm font-bold uppercase tracking-widest border-2 border-black">
            <span>QUERY SUCCESS</span>
            <span className="hidden sm:inline opacity-50">///</span>
            <span>{activeCerts.length} ACTIVE</span>
            <span className="hidden sm:inline opacity-50">///</span>
            <span className="text-error">{revokedCerts.length} REVOKED</span>
          </div>

          <div className="space-y-8">
            {activeCerts.map((cert) => (
              <div key={cert.id} className="brutal-card border-l-[12px] border-l-black">
                <div className="p-6 md:p-10 border-b-2 border-black flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-neutral-500 uppercase tracking-widest block mb-2">
                      TOKEN #{cert.id}
                    </span>
                    <h4 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                      {CERT_TYPE_LABELS[cert.certType] || `TYPE-${cert.certType}`}
                    </h4>
                  </div>
                  <span className="brutal-badge-success self-start md:self-auto text-base py-2">
                    VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-neutral-100">
                  <div className="p-6 border-b-2 md:border-b-0 md:border-r-2 lg:border-b-0 border-black">
                    <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">ISSUED AT</span>
                    <span className="font-mono text-lg font-bold">{formatTimestamp(cert.issuedAt)}</span>
                  </div>
                  <div className="p-6 border-b-2 md:border-b-0 lg:border-r-2 border-black">
                    <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">SCORE</span>
                    <span className="font-mono text-lg font-bold">{cert.score > 0 ? cert.score : 'N/A'}</span>
                  </div>
                  <div className="p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-black break-all">
                    <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">IPFS CID</span>
                    <a href={`https://ipfs.io/ipfs/${cert.ipfsCID}`} target="_blank" rel="noreferrer" className="font-mono text-sm underline decoration-2 underline-offset-4 hover:bg-black hover:text-white inline-flex items-center gap-1">
                      {cert.ipfsCID.substring(0, 12)}... <ExternalLink size={12} strokeWidth={3} />
                    </a>
                  </div>
                  <div className="p-6 break-all">
                    <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">METADATA URI</span>
                    <a href={cert.uri} target="_blank" rel="noreferrer" className="font-mono text-sm underline decoration-2 underline-offset-4 hover:bg-black hover:text-white inline-flex items-center gap-1">
                      {cert.uri.substring(0, 16)}... <ExternalLink size={12} strokeWidth={3} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {revokedCerts.length > 0 && (
            <div className="pt-8 mt-12 border-t-4 border-error border-dashed space-y-4">
              <p className="font-mono text-sm font-bold uppercase tracking-widest text-error">
                // REVOKED RECORDS DETECTED
              </p>
              {revokedCerts.map((cert) => (
                <div key={cert.id} className="brutal-card border-error bg-error/10 p-4 flex items-center justify-between">
                  <span className="font-mono font-bold text-error">TOKEN #{cert.id}</span>
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-error border-2 border-error px-2 py-1">DESTROYED</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
