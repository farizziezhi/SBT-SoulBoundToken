import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

const CERT_TYPES = [
  { value: 1, label: '001 // ORG. KEMAHASISWAAN' },
  { value: 2, label: '002 // KOMPETISI AKADEMIK' },
  { value: 3, label: '003 // PELATIHAN & WORKSHOP' },
  { value: 4, label: '004 // PENGABDIAN MASYARAKAT' },
  { value: 5, label: '005 // PRESTASI OLAHRAGA/SENI' },
  { value: 6, label: '006 // SERTIFIKASI PROFESI' },
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
  const [isIssuer, setIsIssuer]             = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!contract || !account) {
        setIsIssuer(false);
        setIsCheckingRole(false);
        return;
      }
      try {
        setIsCheckingRole(true);
        const ISSUER_ROLE = await contract.ISSUER_ROLE();
        const hasRole = await contract.hasRole(ISSUER_ROLE, account);
        setIsIssuer(hasRole);
      } catch (err) {
        console.error("Failed to check role:", err);
        setIsIssuer(false);
      } finally {
        setIsCheckingRole(false);
      }
    };
    checkRole();
  }, [contract, account]);

  const handleMint = async (e) => {
    e.preventDefault();
    if (!contract) return;

    setStatus('loading');
    setErrorMessage('');
    try {
      const scoreValue = score === '' ? 0 : parseInt(score, 10);
      if (score !== '' && (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100)) {
        setStatus('error');
        setErrorMessage('SCORE MUST BE A NUMBER BETWEEN 0 AND 100.');
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

      const event = receipt.logs
        .map(log => { try { return contract.interface.parseLog(log); } catch (_) { return null; } })
        .find(e => e && e.name === 'CertificateMinted');

      if (event) setMintedTokenId(event.args.tokenId.toString());
      setTxHash(receipt.hash);
      setStatus('success');

      setStudentAddress('');
      setTokenURI('');
      setCertType(1);
      setScore('');
      setIpfsCID('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(
        err.reason || err.message || 'EXECUTION REVERTED. VERIFY ISSUER_ROLE.'
      );
    }
  };

  if (isCheckingRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] brutal-card p-16 text-center animate-fade-in">
        <div className="font-mono text-sm font-bold uppercase tracking-widest animate-pulse">
          [ VERIFYING ISSUER CLEARANCE ... ]
        </div>
      </div>
    );
  }

  if (!account || !isIssuer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] brutal-card p-16 text-center animate-fade-in">
        <AlertTriangle size={48} strokeWidth={1} className="mb-6" />
        <h2 className="font-display text-4xl font-black uppercase tracking-tighter mb-4">ISSUANCE LOCKED</h2>
        <p className="font-mono text-sm text-neutral-600 max-w-md uppercase tracking-wider leading-relaxed">
          {!account 
            ? "AUTHORIZATION REQUIRED. CONNECT A WALLET TO PROCEED." 
            : "ACCESS DENIED. YOUR CONNECTED WALLET DOES NOT POSSESS THE ISSUER_ROLE."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="animate-fade-in border-b-4 border-black pb-8">
        <h1 className="font-display text-5xl md:text-7xl font-black uppercase tracking-tighter mb-2">
          ISSUE
        </h1>
        <p className="font-mono text-sm font-bold tracking-widest text-neutral-500 uppercase">
          // PROTOCOL COMMAND: MINT_SOULBOUND_TOKEN
        </p>
      </header>

      <form onSubmit={handleMint} className="brutal-card animate-fade-in">
        <div className="bg-black text-white p-4 border-b-2 border-black flex justify-between items-center">
          <span className="font-mono text-xs font-bold tracking-widest uppercase">INPUT DATA</span>
          <span className="font-mono text-[10px] tracking-widest opacity-50">STRICT</span>
        </div>
        
        <div className="p-8 md:p-12 space-y-8">
          
          <div className="space-y-3">
            <label className="block font-mono text-xs font-bold uppercase tracking-widest">
              RECIPIENT ADDRESS [0x...]
            </label>
            <input
              type="text"
              required
              placeholder="0x123..."
              value={studentAddress}
              onChange={(e) => setStudentAddress(e.target.value)}
              className="brutal-input text-lg py-4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block font-mono text-xs font-bold uppercase tracking-widest">
                SKPI CATEGORY
              </label>
              <select
                value={certType}
                onChange={(e) => setCertType(parseInt(e.target.value))}
                className="brutal-input text-sm py-4 appearance-none cursor-pointer"
              >
                {CERT_TYPES.map(ct => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block font-mono text-xs font-bold uppercase tracking-widest">
                EVALUATION SCORE [0-100]
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="EMPTY IF N/A"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="brutal-input text-lg py-4"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block font-mono text-xs font-bold uppercase tracking-widest">
              RAW IPFS CID
            </label>
            <input
              type="text"
              required
              placeholder="Qm..."
              value={ipfsCID}
              onChange={(e) => setIpfsCID(e.target.value)}
              className="brutal-input text-lg py-4"
            />
            <p className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              REQUIRED FOR ON-CHAIN RESOLUTION
            </p>
          </div>

          <div className="space-y-3">
            <label className="block font-mono text-xs font-bold uppercase tracking-widest">
              FULL METADATA URI
            </label>
            <input
              type="text"
              required
              placeholder="ipfs://..."
              value={tokenURI}
              onChange={(e) => setTokenURI(e.target.value)}
              className="brutal-input text-lg py-4"
            />
          </div>
        </div>

        <div className="p-8 border-t-2 border-black bg-neutral-100">
          <button type="submit" disabled={status === 'loading'} className="brutal-btn w-full text-xl py-6">
            {status === 'loading' ? '[ EXECUTING... ]' : 'EXECUTE MINT FUNCTION'}
          </button>
        </div>
      </form>

      {/* Status Messages */}
      {status === 'success' && (
        <div className="border-4 border-success p-8 animate-fade-in bg-white">
          <div className="font-display text-4xl font-black uppercase text-success mb-4 tracking-tighter">
            ISSUANCE SUCCESS
          </div>
          <div className="font-mono text-sm space-y-2 font-bold uppercase">
            {mintedTokenId && <p>TOKEN ID: <span className="text-black bg-success/20 px-2">#{mintedTokenId}</span></p>}
            <p className="break-all">TX HASH: {txHash}</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="border-4 border-error p-8 animate-fade-in bg-white">
          <div className="font-display text-4xl font-black uppercase text-error mb-4 tracking-tighter">
            ISSUANCE FAILED
          </div>
          <div className="font-mono text-sm font-bold uppercase break-words text-error">
            {errorMessage}
          </div>
        </div>
      )}
    </div>
  );
}
