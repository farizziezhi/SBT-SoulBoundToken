import { useState } from 'react';
import { CheckCircle2, AlertTriangle, UserPlus, Link as LinkIcon, Hash, Star } from 'lucide-react';

// Certificate type codes matching SKPI categories
const CERT_TYPES = [
  { value: 1, label: '001 — Organisasi Kemahasiswaan' },
  { value: 2, label: '002 — Kompetisi Akademik' },
  { value: 3, label: '003 — Pelatihan & Workshop' },
  { value: 4, label: '004 — Pengabdian Masyarakat' },
  { value: 5, label: '005 — Prestasi Olahraga / Seni' },
  { value: 6, label: '006 — Sertifikasi Profesi' },
];

export default function Mint({ account, contract }) {
  const [studentAddress, setStudentAddress] = useState('');
  const [tokenURI, setTokenURI]             = useState('');
  const [certType, setCertType]             = useState(1);
  const [score, setScore]                   = useState('');
  const [ipfsCID, setIpfsCID]               = useState('');
  const [status, setStatus]                 = useState('idle');
  const [txHash, setTxHash]                 = useState('');
  const [mintedTokenId, setMintedTokenId]   = useState('');
  const [errorMessage, setErrorMessage]     = useState('');

  const handleMint = async (e) => {
    e.preventDefault();
    if (!contract) return;

    setStatus('loading');
    setErrorMessage('');
    try {
      const scoreValue = score === '' ? 0 : parseInt(score, 10);
      if (score !== '' && (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100)) {
        setStatus('error');
        setErrorMessage('Score must be a number between 0 and 100.');
        return;
      }

      const tx = await contract.mintToStudent(
        studentAddress,
        tokenURI,
        certType,
        scoreValue,
        ipfsCID
      );
      const receipt = await tx.wait();

      // Extract tokenId from CertificateMinted event
      const event = receipt.logs
        .map(log => { try { return contract.interface.parseLog(log); } catch (_) { return null; } })
        .find(e => e && e.name === 'CertificateMinted');

      if (event) setMintedTokenId(event.args.tokenId.toString());
      setTxHash(receipt.hash);
      setStatus('success');

      // Reset form
      setStudentAddress('');
      setTokenURI('');
      setCertType(1);
      setScore('');
      setIpfsCID('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(
        err.reason || err.message || 'Execution reverted. Ensure you have ISSUER_ROLE.'
      );
    }
  };

  /* ── Auth Gate ── */
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] tonal-card p-16 text-center animate-fade-up">
        <div className="w-20 h-20 rounded-card bg-surface-high flex items-center justify-center mb-8">
          <AlertTriangle size={32} className="text-outline" />
        </div>
        <h2 className="font-display text-2xl font-bold text-on-surface mb-3">Restricted Access</h2>
        <p className="font-body text-sm text-on-surface-variant max-w-md leading-relaxed">
          Connect an authorized wallet with ISSUER_ROLE to access the credential issuance protocol.
        </p>
      </div>
    );
  }

  /* ── Mint Form ── */
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* Header */}
      <header className="animate-fade-up">
        <h1 className="font-display text-4xl font-bold text-on-surface tracking-tight mb-2">Issue Credential</h1>
        <p className="font-body text-on-surface-variant">
          SBT Minting Protocol — SKPI Academic Record
        </p>
      </header>

      {/* Form */}
      <form onSubmit={handleMint} className="tonal-card p-8 md:p-10 space-y-6 animate-fade-up-d1">

        {/* Recipient Address */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            <UserPlus size={14} /> Recipient Wallet Address
          </label>
          <input
            type="text"
            required
            placeholder="0x..."
            value={studentAddress}
            onChange={(e) => setStudentAddress(e.target.value)}
            className="input-ethereal"
          />
        </div>

        {/* Certificate Type */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            <Hash size={14} /> Certificate Type (SKPI Category)
          </label>
          <select
            value={certType}
            onChange={(e) => setCertType(parseInt(e.target.value))}
            className="input-ethereal"
          >
            {CERT_TYPES.map(ct => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>
        </div>

        {/* Score */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            <Star size={14} /> Achievement Score (0–100, leave blank if N/A)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="e.g. 85 — or leave blank"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="input-ethereal"
          />
        </div>

        {/* IPFS CID */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            <Hash size={14} /> IPFS Content Identifier (CID)
          </label>
          <input
            type="text"
            required
            placeholder="QmXoypiz..."
            value={ipfsCID}
            onChange={(e) => setIpfsCID(e.target.value)}
            className="input-ethereal"
          />
          <p className="font-label text-[11px] text-outline">
            Raw CID without ipfs:// prefix. Used for on-chain verification.
          </p>
        </div>

        {/* Full Token URI */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            <LinkIcon size={14} /> Full IPFS Metadata URI
          </label>
          <input
            type="text"
            required
            placeholder="ipfs://Qm..."
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            className="input-ethereal"
          />
          <p className="font-label text-[11px] text-outline">
            Full URI used for tokenURI() — typically ipfs://&lt;CID&gt;/metadata.json
          </p>
        </div>

        <button type="submit" disabled={status === 'loading'} className="btn-gradient w-full text-center">
          {status === 'loading' ? 'Executing Sequence...' : 'Mint Soulbound Token'}
        </button>

        {/* Success */}
        {status === 'success' && (
          <div className="bg-verified/5 rounded-card p-6 space-y-2 animate-fade-up">
            <div className="flex items-center gap-2 text-verified">
              <CheckCircle2 size={20} />
              <span className="font-display text-lg font-semibold">Credential Issued Successfully</span>
            </div>
            {mintedTokenId && (
              <p className="font-label text-xs text-verified/70">Token ID: #{mintedTokenId}</p>
            )}
            <p className="font-label text-xs text-verified/70 break-all">Tx: {txHash}</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="bg-error-container/10 rounded-card p-6 space-y-2 animate-fade-up">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle size={20} />
              <span className="font-display text-lg font-semibold">Issuance Failed</span>
            </div>
            <p className="font-label text-xs text-error/70 break-words">{errorMessage}</p>
          </div>
        )}
      </form>
    </div>
  );
}
