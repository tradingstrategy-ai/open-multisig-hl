/**
 * Hyperliquid `/info` endpoint helpers for reading account balances.
 *
 * See: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
 */

import type { Network } from './types'

const MAINNET_API = 'https://api.hyperliquid.xyz/info'
const TESTNET_API = 'https://api.hyperliquid-testnet.xyz/info'

export interface HyperliquidBalances {
	/** USDC held as perp collateral (accountValue from marginSummary). */
	usdcPerp: string
	/** Signed size of the HYPE perp position (negative if short, 0 if none). */
	hypePerp: string
	/** USDC balance in the spot account. */
	usdcSpot: string
	/** HYPE balance in the spot account. */
	hypeSpot: string
}

interface ClearinghouseState {
	marginSummary?: { accountValue?: string }
	assetPositions?: Array<{
		position?: { coin?: string; szi?: string }
	}>
}

interface SpotClearinghouseState {
	balances?: Array<{ coin?: string; total?: string; hold?: string }>
}

function apiUrl(network: Network): string {
	return network === 'Mainnet' ? MAINNET_API : TESTNET_API
}

async function postInfo<T>(network: Network, body: Record<string, unknown>): Promise<T> {
	const res = await fetch(apiUrl(network), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) {
		throw new Error(`Hyperliquid info API returned ${res.status} ${res.statusText}`)
	}
	return (await res.json()) as T
}

/** Fetch USDC + HYPE balances across perp and spot accounts for a given user. */
export async function fetchBalances(
	user: string,
	network: Network,
): Promise<HyperliquidBalances> {
	const [perp, spot] = await Promise.all([
		postInfo<ClearinghouseState>(network, { type: 'clearinghouseState', user }),
		postInfo<SpotClearinghouseState>(network, { type: 'spotClearinghouseState', user }),
	])

	const usdcPerp = perp.marginSummary?.accountValue ?? '0'
	const hypePerpPos = perp.assetPositions?.find((p) => p.position?.coin === 'HYPE')
	const hypePerp = hypePerpPos?.position?.szi ?? '0'

	const usdcSpotBal = spot.balances?.find((b) => b.coin === 'USDC')
	const hypeSpotBal = spot.balances?.find((b) => b.coin === 'HYPE')

	return {
		usdcPerp,
		hypePerp,
		usdcSpot: usdcSpotBal?.total ?? '0',
		hypeSpot: hypeSpotBal?.total ?? '0',
	}
}
