import { useState } from 'react';
import { CheckCircle2, AlertTriangle, UserPlus, Link as LinkIcon, Stamp } from 'lucide-react';

export default function Mint({ account, contract }) {
  const [studentAddress, setStudentAddress] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [status, setStatus] = useState('idle');
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
      setErrorMessage(err.reason || err.message || 'Execution reverted. Ensure you have the ISSUER_ROLE.');
    }
  };

  /* ── Auth Gate ── */
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center animate-fade-up">
        <div className="w-20 h-20 border border-zinc-800 flex items-center justify-center mb-8">
          <AlertTriangle size={28} className="text-zinc-600" />
        </div>
        <h2 className="font-serif text-4xl italic text-zinc-300 mb-4">Restricted Access</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 max-w-sm leading-relaxed">
          Connect an authorized wallet with ISSUER_ROLE to access the credential issuance protocol.
        </p>
      </div>
    );
  }

  /* ── Mint Form ── */
  return (
    <div className="max-w-2xl mx-auto space-y-14">
      {/* Header */}
      <header className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl italic text-zinc-100 tracking-tight mb-3 scan-line">
              Issue Credential
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mt-6">
              SBT Minting Protocol
            </p>
          </div>
          <Stamp size={48} className="text-zinc-800 hidden md:block" />
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleMint} className="card-vault p-8 md:p-10 space-y-8 animate-fade-up-delayed">

        <div className="space-y-3">
          <label className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
            <UserPlus size={11} /> Recipient Wallet Address
          </label>
          <input
            type="text"
            required
            placeholder="0x..."
            value={studentAddress}
            onChange={(e) => setStudentAddress(e.target.value)}
            className="input-classified"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
            <LinkIcon size={11} /> IPFS Metadata URI
          </label>
          <input
            type="text"
            required
            placeholder="ipfs://Qm..."
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            className="input-classified"
          />
        </div>

        <button type="submit" disabled={status === 'loading'} className="btn-seal">
          {status === 'loading' ? 'Executing Sequence...' : 'Mint Soulbound Token'}
        </button>

        {/* Success */}
        {status === 'success' && (
          <div className="bg-verified/5 border border-verified/20 p-6 space-y-3 animate-fade-up">
            <div className="flex items-center gap-3 text-verified">
              <CheckCircle2 size={20} />
              <span className="font-serif text-xl italic">Credential Issued</span>
            </div>
            <p className="font-mono text-[10px] text-verified/70 uppercase tracking-[0.1em] break-all">
              Tx: {txHash}
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="bg-revoked/5 border border-revoked/20 p-6 space-y-3 animate-fade-up">
            <div className="flex items-center gap-3 text-revoked">
              <AlertTriangle size={20} />
              <span className="font-serif text-xl italic">Issuance Failed</span>
            </div>
            <p className="font-mono text-[10px] text-revoked/70 break-words">
              {errorMessage}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
