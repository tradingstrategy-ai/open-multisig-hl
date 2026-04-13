import { parseSignature } from 'viem'
import { buildSignTypedDataParams, getActionDef } from './eip712'
import type { FormValues, SignatureResult } from './types'

type Provider = {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

// Recursively convert BigInt to Number so JSON.stringify doesn't throw.
// Safe here because all uint64 values in Hyperliquid's EIP-712 are nonces/timestamps
// that fit comfortably within Number's safe integer range.
function normalizeBigInts(obj: unknown): unknown {
	if (typeof obj === 'bigint') return Number(obj)
	if (Array.isArray(obj)) return obj.map(normalizeBigInts)
	if (obj !== null && typeof obj === 'object')
		return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, normalizeBigInts(v)]))
	return obj
}

/**
 * Sign an inner multisig payload.
 *
 * @param outerSignerAddress - The address that will submit the bundle (outer signer).
 *   Defaults to walletAddress if omitted. For multi-party flows, pass the coordinator's
 *   address so all inner EIP-712 messages commit to the same outerSigner.
 */
export async function signMultisig(
	provider: Provider,
	walletAddress: string,
	values: FormValues,
	outerSignerAddress?: string,
): Promise<SignatureResult> {
	const params = buildSignTypedDataParams(values, outerSignerAddress ?? walletAddress)

	// Normalize BigInts before serialization
	const domain = normalizeBigInts(params.domain) as typeof params.domain
	const message = normalizeBigInts(params.message) as Record<string, unknown>

	// MetaMask enforces that the wallet's current chainId matches the domain's chainId
	// before signing eth_signTypedData_v4. Switch to Arbitrum Sepolia (0x66eee = 421614)
	// which is the chainId Hyperliquid uses in its EIP-712 domain as a protocol constant.
	try {
		await provider.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: '0x66eee' }],
		})
	} catch (switchErr: unknown) {
		if ((switchErr as { code?: number }).code === 4902) {
			await provider.request({
				method: 'wallet_addEthereumChain',
				params: [{
					chainId: '0x66eee',
					chainName: 'Arbitrum Sepolia',
					nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
					rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
					blockExplorerUrls: ['https://sepolia.arbiscan.io'],
				}],
			})
		} else {
			throw new Error('Please switch your wallet to Arbitrum Sepolia (chainId 421614) to sign.')
		}
	}

	const typedData = { domain, types: params.types, primaryType: params.primaryType, message }
	const rawSig = (await provider.request({
		method: 'eth_signTypedData_v4',
		params: [walletAddress, JSON.stringify(typedData)],
	})) as `0x${string}`

	const { r, s, v } = parseSignature(rawSig)

	const actionDef = getActionDef(values.actionType)

	return {
		signer: walletAddress,
		signature: { r, s, v: Number(v) },
		payload: {
			type: values.actionType,
			signingMode: actionDef.signingMode,
			multisigAddress: values.multisigAddress,
			network: values.network,
			vaultAddress: values.vaultAddress,
			fields: { ...values.fields },
		},
	}
}
