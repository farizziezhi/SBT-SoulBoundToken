import { useState } from 'react';
import { Search, Loader2, Award, XCircle, CheckCircle, Lock, ExternalLink, ShieldCheck, ShieldOff } from 'lucide-react';

// Map certType code to human-readable label
const CERT_TYPE_LABELS = {
  1: '001 — Organisasi Kemahasiswaan',
  2: '002 — Kompetisi Akademik',
  3: '003 — Pelatihan & Workshop',
  4: '004 — Pengabdian Masyarakat',
  5: '005 — Prestasi Olahraga / Seni',
  6: '006 — Sertifikasi Profesi',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  return new Date(Number(ts) * 1000).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
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
      if (!contract) throw new Error('MetaMask is required to query the network.');

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
    <div className="space-y-10">
      {/* Header */}
      <header className="animate-fade-up">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-on-surface tracking-tight mb-2">
          Public Verification
        </h1>
        <p className="font-body text-on-surface-variant max-w-xl">
          Cryptographically verify academic credentials attached to any Ethereum address.
          On-chain data — read-only, zero gas required.
        </p>
      </header>

      {/* Search Bar */}
      <form onSubmit={handleVerify} className="flex items-end gap-3 animate-fade-up-d1">
        <div className="flex-1 space-y-2">
          <label className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Target Wallet Address
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input-ethereal !text-base !py-4"
          />
        </div>
        <button type="submit" className="btn-gradient flex items-center justify-center w-14 h-14 !p-0 shrink-0">
          {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
        </button>
      </form>

      {/* Results */}
      {status === 'loading' && (
        <div className="flex flex-col items-center py-16 animate-fade-up">
          <div className="w-3 h-3 rounded-full bg-tertiary animate-pulse mb-4"></div>
          <p className="font-body text-sm text-on-surface-variant">Querying on-chain state...</p>
        </div>
      )}

      {status === 'not-found' && (
        <div className="tonal-card p-14 text-center animate-fade-up">
          <XCircle size={40} className="text-error/30 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-on-surface mb-2">No Credentials Found</h3>
          <p className="font-body text-sm text-on-surface-variant">
            The queried address holds zero valid soulbound tokens on this contract.
          </p>
        </div>
      )}

      {status === 'found' && (
        <div className="space-y-6 animate-fade-up">
          {/* Summary banner */}
          <div className="badge-verified inline-flex text-sm">
            <CheckCircle size={16} />
            {activeCerts.length} Active · {revokedCerts.length} Revoked — Total {certificates.length} Records
          </div>

          {/* Active Certificates */}
          {activeCerts.map((cert, i) => (
            <div key={cert.id} className={`tonal-card p-6 md:p-8 animate-fade-up-d${Math.min(i + 1, 3)}`}>
              {/* Header row */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-card bg-gradient-to-br from-secondary/10 to-primary-container/10 flex items-center justify-center shrink-0">
                    <Award className="text-secondary" size={24} />
                  </div>
                  <div>
                    <h4 className="font-display text-lg font-bold text-on-surface mb-1">
                      {CERT_TYPE_LABELS[cert.certType] || `Type ${cert.certType}`}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Lock size={10} className="text-primary" />
                      <span className="badge-soulbound">Soulbound · Token #{cert.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-verified/10 rounded-full px-3 py-1.5">
                  <ShieldCheck size={12} className="text-verified" />
                  <span className="font-label text-[10px] text-verified uppercase tracking-wider font-bold">Valid</span>
                </div>
              </div>

              {/* Data grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-low rounded-card p-4">
                <div>
                  <span className="font-label text-[10px] uppercase tracking-wider text-outline block mb-1">Issued At</span>
                  <span className="font-body text-sm text-on-surface">{formatTimestamp(cert.issuedAt)}</span>
                </div>
                <div>
                  <span className="font-label text-[10px] uppercase tracking-wider text-outline block mb-1">Score</span>
                  <span className="font-body text-sm text-on-surface">
                    {cert.score > 0 ? `${cert.score} / 100` : '— (N/A)'}
                  </span>
                </div>
                <div>
                  <span className="font-label text-[10px] uppercase tracking-wider text-outline block mb-1">IPFS CID</span>
                  <a
                    href={`https://ipfs.io/ipfs/${cert.ipfsCID}`}
                    target="_blank" rel="noreferrer"
                    className="text-primary hover:text-primary-dim transition-colors inline-flex items-center gap-1 text-sm break-all"
                  >
                    {cert.ipfsCID.length > 16 ? cert.ipfsCID.substring(0, 16) + '...' : cert.ipfsCID}
                    <ExternalLink size={11} />
                  </a>
                </div>
                <div>
                  <span className="font-label text-[10px] uppercase tracking-wider text-outline block mb-1">Token URI</span>
                  <a
                    href={cert.uri}
                    target="_blank" rel="noreferrer"
                    className="text-primary hover:text-primary-dim transition-colors inline-flex items-center gap-1 text-sm break-all"
                  >
                    {cert.uri.length > 24 ? cert.uri.substring(0, 24) + '...' : cert.uri}
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Revoked Certificates */}
          {revokedCerts.length > 0 && (
            <div className="space-y-3">
              <p className="font-label text-xs uppercase tracking-wider text-outline">
                Revoked / Burned Records
              </p>
              {revokedCerts.map((cert) => (
                <div key={cert.id} className="tonal-card p-4 opacity-50 flex items-center gap-4">
                  <ShieldOff size={14} className="text-error shrink-0" />
                  <span className="font-label text-xs text-error">
                    Token #{cert.id} — Revoked / Burned
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
