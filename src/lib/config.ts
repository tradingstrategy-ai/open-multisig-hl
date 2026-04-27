/**
 * Public runtime configuration.
 *
 * Values are read from SvelteKit's `$env/static/public`, which means they are
 * baked into the static bundle at build time. Set them via `.env` for local
 * development or as repository secrets in the deploy workflow.
 *
 * Per project convention (see CLAUDE.md), client-accessible env vars use the
 * `TS_PUBLIC_` prefix — configured in `svelte.config.js` via `kit.env.publicPrefix`.
 */

import { env } from '$env/dynamic/public'

/**
 * WalletConnect (Reown Cloud) project credentials.
 *
 * The project ID identifies this dapp to the WalletConnect relay network so
 * mobile wallets can pair with the desktop UI via QR code. Get a free project
 * ID at https://cloud.reown.com.
 *
 * If unset, AppKit still loads but mobile-wallet pairing will be disabled —
 * a console warning is emitted to surface the misconfiguration.
 */
export const walletConnectConfig = (() => {
	const projectId = env.TS_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? ''
	if (!projectId && typeof window !== 'undefined') {
		console.warn(
			'TS_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set — WalletConnect (mobile wallet support) will be disabled. ' +
				'Set it in .env (local) or as a repo secret (deploy workflow).',
		)
	}
	return { projectId }
})()
