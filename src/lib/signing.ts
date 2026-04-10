import { parseSignature, recoverTypedDataAddress } from 'viem'
import { buildSignTypedDataParams, getActionDef } from './eip712'
import type { FormValues, SignatureResult } from './types'

type Provider = {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

export async function signMultisig(
	provider: Provider,
	walletAddress: string,
	values: FormValues,
): Promise<SignatureResult> {
	const params = buildSignTypedDataParams(values, walletAddress)

	// Use eth_signTypedData_v4 directly to avoid viem enforcing that the wallet's
	// current network chainId matches the EIP-712 domain chainId. Hyperliquid uses
	// chainId 421614 in its domain as a protocol constant — users should be able to
	// sign from any network without being forced to switch chains.
	const typedData = {
		domain: params.domain,
		types: params.types,
		primaryType: params.primaryType,
		message: params.message,
	}
	const rawSig = (await provider.request({
		method: 'eth_signTypedData_v4',
		params: [walletAddress, JSON.stringify(typedData)],
	})) as `0x${string}`

	const { r, s, v } = parseSignature(rawSig)

	const recovered = await recoverTypedDataAddress({
		domain: params.domain,
		types: params.types as Record<string, Array<{ name: string; type: string }>>,
		primaryType: params.primaryType,
		message: params.message as Record<string, unknown>,
		signature: rawSig,
	})

	if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
		throw new Error(`Recovery mismatch: expected ${walletAddress}, got ${recovered}`)
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
