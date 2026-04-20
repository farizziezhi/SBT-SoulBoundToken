import { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import abi from '../abi.json';

// Use env var in production or fallback for local dev
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xYourContractAddressHere";

export function useContract() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      const p = new BrowserProvider(window.ethereum);
      setProvider(p);
      
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            setAccount(accounts[0]);
            window.location.reload();
        } else {
            setAccount(null);
            setContract(null);
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask is required for authentication.");
      return;
    }
    
    try {
      // Prompt user to connect wallet
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // Initialize Ethers Signer and Contract instance
      const p = new BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      setSigner(s);
      
      const c = new Contract(CONTRACT_ADDRESS, abi, s);
      setContract(c);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to connect wallet.");
    }
  };

  // Allow read-only operations without connecting wallet (e.g., for public verification)
  const getReadOnlyContract = () => {
      if (!window.ethereum) return null;
      const p = new BrowserProvider(window.ethereum);
      return new Contract(CONTRACT_ADDRESS, abi, p);
  }

  return { connectWallet, account, contract, error, getReadOnlyContract };
}
