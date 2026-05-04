import { useEffect, useState } from 'react';
import { Award, Lock, ExternalLink, ShieldOff, ShieldCheck } from 'lucide-react';

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

export default function Dashboard({ account, contract }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    if (account && contract) fetchCertificates();
  }, [account, contract]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const tokenIds = await contract.getStudentCertificates(account);
      const data = await Promise.all(
        tokenIds.map(async (id) => {
          try {
            const [owner, certType, issuedAt, score, isRevoked, ipfsCID] =
              await contract.verifyCertificate(id);
            const uri = await contract.tokenURI(id);
            const locked = await contract.locked(id);
            return {
              id: id.toString(), owner, certType: Number(certType),
              issuedAt: issuedAt.toString(), score: Number(score),
              isRevoked, ipfsCID, uri, locked, exists: true,
            };
          } catch (_) {
            return { id: id.toString(), exists: false, isRevoked: true };
          }
        })
      );
      setCertificates(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  /* ── Auth Gate ── */
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] brutal-card p-16 text-center animate-fade-in">
        <ShieldOff size={48} strokeWidth={1} className="mb-6" />
        <h2 className="font-display text-4xl font-black uppercase tracking-tighter mb-4">ACCESS DENIED</h2>
        <p className="font-mono text-sm text-neutral-600 max-w-md uppercase tracking-wider leading-relaxed">
          CONNECTION REQUIRED TO VIEW ENCRYPTED ACADEMIC LEDGER. PLEASE AUTHENTICATE WALLET.
        </p>
      </div>
    );
  }

  const activeCerts = certificates.filter(c => c.exists && !c.isRevoked);
  const totalIssued = certificates.length;

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="animate-fade-in border-b-4 border-black pb-8">
        <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter mb-2">
          LEDGER
        </h1>
        <p className="font-mono text-sm font-bold tracking-widest text-neutral-500 uppercase">
          // IMMUTABLE ACADEMIC DOSSIER
        </p>
      </header>

      {/* Stats */}
      {!loading && totalIssued > 0 && (
        <div className="grid grid-cols-2 gap-0 border-2 border-black animate-fade-in">
          <div className="p-8 border-r-2 border-black bg-white flex flex-col justify-between">
            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-4">STATUS: ACTIVE</p>
            <p className="font-display text-7xl font-black">{activeCerts.length}</p>
          </div>
          <div className="p-8 bg-neutral-100 flex flex-col justify-between">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">TOTAL ISSUED</p>
            <p className="font-display text-7xl font-black text-neutral-400">{totalIssued}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="brutal-card p-12 text-center animate-fade-in bg-black text-white">
          <div className="font-mono text-sm font-bold uppercase tracking-widest animate-pulse">
            [ QUERYING BLOCKCHAIN STATE ... ]
          </div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="brutal-card p-16 text-center animate-fade-in border-dashed border-4 border-neutral-300">
          <Award size={48} strokeWidth={1} className="mx-auto mb-6 text-neutral-400" />
          <p className="font-mono text-sm font-bold text-neutral-500 uppercase tracking-widest">
            NO CREDENTIALS LOCATED IN REGISTRY
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {certificates.map((cert, i) => (
            <div
              key={cert.id}
              className={`brutal-card flex flex-col animate-fade-in ${!cert.exists ? 'bg-neutral-100' : 'bg-white'}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Card Header */}
              <div className="border-b-2 border-black p-4 flex justify-between items-center bg-neutral-100">
                <div className="font-mono font-black text-xl">#{cert.id}</div>
                <div className="flex gap-2">
                  {cert.exists && cert.locked && (
                    <span className="brutal-badge">
                      <Lock size={12} strokeWidth={3} /> SOULBOUND
                    </span>
                  )}
                  {cert.isRevoked ? (
                    <span className="brutal-badge-error">REVOKED</span>
                  ) : (
                    <span className="brutal-badge-inverted">VALID</span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                <h3 className="font-display text-3xl font-black uppercase tracking-tighter leading-none mb-8">
                  {cert.certType ? (CERT_TYPE_LABELS[cert.certType] || `TYPE-${cert.certType}`) : 'UNKNOWN'}
                </h3>

                {cert.exists && (
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <p className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">DATE ISSUED</p>
                      <p className="font-mono text-sm font-bold">{formatTimestamp(cert.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">EVALUATION SCORE</p>
                      <p className="font-mono text-sm font-bold">{cert.score > 0 ? `${cert.score}/100` : 'N/A'}</p>
                    </div>
                    <div className="col-span-2 pt-4 border-t-2 border-dashed border-neutral-300">
                      <p className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">METADATA URI</p>
                      <a
                        href={cert.uri}
                        target="_blank" rel="noreferrer"
                        className="font-mono text-xs underline decoration-2 underline-offset-4 hover:bg-black hover:text-white transition-colors break-all inline-flex items-center gap-1 p-1 -ml-1"
                      >
                        {cert.uri} <ExternalLink size={12} strokeWidth={3} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
