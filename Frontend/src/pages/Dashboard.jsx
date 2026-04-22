import { useEffect, useState } from 'react';
import { Award, Lock, ExternalLink, ShieldOff, ShieldCheck } from 'lucide-react';

const CERT_TYPE_LABELS = {
  1: 'Organisasi Kemahasiswaan',
  2: 'Kompetisi Akademik',
  3: 'Pelatihan & Workshop',
  4: 'Pengabdian Masyarakat',
  5: 'Prestasi Olahraga / Seni',
  6: 'Sertifikasi Profesi',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  return new Date(Number(ts) * 1000).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
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
      <div className="flex flex-col items-center justify-center min-h-[55vh] tonal-card p-16 text-center animate-fade-up">
        <div className="w-20 h-20 rounded-card bg-surface-high flex items-center justify-center mb-8">
          <ShieldOff size={32} className="text-outline" />
        </div>
        <h2 className="font-display text-2xl font-bold text-on-surface mb-3">Authentication Required</h2>
        <p className="font-body text-sm text-on-surface-variant max-w-md leading-relaxed">
          Connect your MetaMask wallet to access academic records sealed on the Ethereum blockchain.
        </p>
      </div>
    );
  }

  const activeCerts = certificates.filter(c => c.exists && !c.isRevoked);
  const totalIssued = certificates.length;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="animate-fade-up">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-on-surface tracking-tight mb-2">
          Your Immutable Records
        </h1>
        <p className="font-body text-on-surface-variant">
          Credential Registry — Verified on Chain
        </p>
      </header>

      {/* Stats */}
      {!loading && totalIssued > 0 && (
        <div className="grid grid-cols-2 gap-4 animate-fade-up">
          <div className="tonal-card p-6">
            <p className="font-label text-xs uppercase tracking-wider text-on-surface-variant mb-2">Active</p>
            <p className="font-display text-4xl font-bold text-verified">{activeCerts.length}</p>
          </div>
          <div className="tonal-card p-6">
            <p className="font-label text-xs uppercase tracking-wider text-on-surface-variant mb-2">Total Issued</p>
            <p className="font-display text-4xl font-bold text-on-surface">{totalIssued}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="tonal-card p-10 animate-fade-up">
          <div className="flex items-center gap-4">
            <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse"></span>
            <p className="font-body text-sm text-on-surface-variant">
              Synchronizing with ledger...
            </p>
          </div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="tonal-card p-16 text-center animate-fade-up">
          <Award size={32} className="text-outline mx-auto mb-6" />
          <p className="font-body text-sm text-on-surface-variant">
            No credentials found for this address.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert, i) => (
            <div
              key={cert.id}
              className={`tonal-card p-8 animate-fade-up-d${Math.min(i + 1, 3)} ${!cert.exists ? 'opacity-40' : ''}`}
            >
              {/* Status badges */}
              <div className="flex items-center justify-between mb-6">
                {cert.exists && cert.locked && (
                  <span className="badge-soulbound"><Lock size={10} /> Soulbound</span>
                )}
                {cert.isRevoked ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <ShieldOff size={12} className="text-error" />
                    <span className="font-label text-[10px] uppercase tracking-wider text-error font-bold">Revoked</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <ShieldCheck size={12} className="text-verified" />
                    <span className="font-label text-[10px] uppercase tracking-wider text-verified font-bold">Valid</span>
                  </div>
                )}
              </div>

              <div className="w-12 h-12 rounded-card bg-gradient-to-br from-secondary/10 to-primary-container/10 flex items-center justify-center mb-4">
                <Award className="text-secondary" size={22} />
              </div>

              <h3 className="font-display text-lg font-bold text-on-surface mb-5">
                {cert.certType ? (CERT_TYPE_LABELS[cert.certType] || `Type ${cert.certType}`) : 'Certificate'}
              </h3>

              <div className="space-y-3">
                <div className="flex flex-col border-t border-surface-low pt-3">
                  <span className="font-label text-[10px] uppercase tracking-wider text-outline mb-1">Token ID</span>
                  <span className="font-body text-sm font-semibold text-on-surface">#{cert.id}</span>
                </div>

                {cert.exists && (
                  <>
                    <div className="flex flex-col border-t border-surface-low pt-3">
                      <span className="font-label text-[10px] uppercase tracking-wider text-outline mb-1">Issued At</span>
                      <span className="font-body text-sm text-on-surface">{formatTimestamp(cert.issuedAt)}</span>
                    </div>

                    <div className="flex flex-col border-t border-surface-low pt-3">
                      <span className="font-label text-[10px] uppercase tracking-wider text-outline mb-1">Score</span>
                      <span className="font-body text-sm text-on-surface">
                        {cert.score > 0 ? `${cert.score} / 100` : '— (N/A)'}
                      </span>
                    </div>

                    <div className="flex flex-col border-t border-surface-low pt-3">
                      <span className="font-label text-[10px] uppercase tracking-wider text-outline mb-1">Metadata URI</span>
                      <a
                        href={cert.uri}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:text-primary-dim transition-colors break-all text-sm"
                      >
                        {cert.uri.length > 28 ? cert.uri.substring(0, 28) + '...' : cert.uri}
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
