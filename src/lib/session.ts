import type { Session, FormValues } from './types';

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
    return JSON.parse(json) as Session;
  } catch {
    return null;
  }
}

// Build a shareable URL from a session
export function buildShareUrl(session: Session): string {
  const encoded = encodeSession(session);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/sign?s=${encoded}`;
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
  return {
    actionType: session.actionType,
    multisigAddress: session.multisigAddress,
    network: session.network,
    vaultAddress: session.vaultAddress,
    fields: { ...session.fields },
  };
}
