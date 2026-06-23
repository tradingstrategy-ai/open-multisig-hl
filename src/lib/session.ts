import { resolve } from '$app/paths';
import type { Session, FormValues, Network } from './types';

const NETWORK_ALIASES: Record<string, Network> = {
	mainnet: 'Mainnet',
	main: 'Mainnet',
	mainet: 'Mainnet',
	testnet: 'Testnet',
	test: 'Testnet',
};

// Encode session to URL-safe base64 for sharing
export function encodeSession(session: Session): string {
  const json = JSON.stringify(session);
  const bytes = new TextEncoder().encode(json);
  return btoa(String.fromCharCode(...bytes));
}

// Decode session from URL parameter
export function decodeSession(encoded: string): Session | null {
  try {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const session = JSON.parse(json) as Session;
    return {
      ...session,
      network: parseNetwork(session.network),
    };
  } catch {
    return null;
  }
}

// Build a shareable URL from a session.
// Uses resolve('/sign') so the SvelteKit base path is applied — otherwise
// the generated link would drop the /open-multisig-hl segment on the Pages
// deployment and the recipient would 404.
export function buildShareUrl(session: Session): string {
  const encoded = encodeSession(session);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${resolve('/sign')}?s=${encoded}`;
}

// Create a session from current form values
export function createSession(values: FormValues, createdBy: string): Session {
  return {
    actionType: values.actionType,
    multisigAddress: values.multisigAddress,
    network: values.network,
    vaultAddress: values.vaultAddress,
    fields: { ...values.fields },
    createdBy,
    createdAt: Date.now(),
  };
}

// Convert a session back to form values (for the signer page)
export function sessionToFormValues(session: Session): FormValues {
  const fields = { ...session.fields };
  if (session.actionType === 'createVault' && fields._nonce && !fields.nonce) {
    fields.nonce = fields._nonce;
    delete fields._nonce;
  }
  return {
    actionType: session.actionType,
    multisigAddress: session.multisigAddress,
    network: parseNetwork(session.network),
    vaultAddress: session.vaultAddress,
    fields,
  };
}

function parseNetwork(value: unknown): Network {
  if (typeof value !== 'string') {
    throw new Error(`Invalid network in shared session: ${String(value)}`);
  }

  const network = NETWORK_ALIASES[value.trim().toLowerCase()];
  if (!network) {
    throw new Error(`Invalid network in shared session: ${value}`);
  }
  return network;
}
