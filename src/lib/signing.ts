import { parseSignature, verifyTypedData } from 'viem'
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

export async function signMultisig(
	provider: Provider,
	walletAddress: string,
	values: FormValues,
): Promise<SignatureResult> {
	const params = buildSignTypedDataParams(values, walletAddress)

	// Normalize BigInts before serialization
	const domain = normalizeBigInts(params.domain) as typeof params.domain
	const message = normalizeBigInts(params.message) as Record<string, unknown>

	// Call eth_signTypedData_v4 directly on the provider to bypass viem's
	// chainId enforcement. Hyperliquid uses chainId 421614 in its EIP-712 domain
	// as a protocol constant — signers should not need to switch networks.
	const typedData = { domain, types: params.types, primaryType: params.primaryType, message }
	const rawSig = (await provider.request({
		method: 'eth_signTypedData_v4',
		params: [walletAddress, JSON.stringify(typedData)],
	})) as `0x${string}`

	const { r, s, v } = parseSignature(rawSig)

	// Verify using verifyTypedData which re-encodes exactly as the wallet did
	const valid = await verifyTypedData({
		address: walletAddress as `0x${string}`,
		domain,
		types: params.types as Record<string, Array<{ name: string; type: string }>>,
		primaryType: params.primaryType,
		message,
		signature: rawSig,
	})

	if (!valid) {
		throw new Error(`Signature verification failed for ${walletAddress}`)
	}

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
