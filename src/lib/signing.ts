import { parseSignature, recoverTypedDataAddress, type WalletClient } from 'viem'
import { buildSignTypedDataParams, getActionDef } from './eip712'
import type { FormValues, SignatureResult } from './types'

export async function signMultisig(
	walletClient: WalletClient,
	walletAddress: string,
	values: FormValues,
): Promise<SignatureResult> {
	const params = buildSignTypedDataParams(values, walletAddress)

	const rawSig = await walletClient.signTypedData({
		account: walletAddress as `0x${string}`,
		domain: params.domain,
		types: params.types as Record<string, Array<{ name: string; type: string }>>,
		primaryType: params.primaryType,
		message: params.message as Record<string, unknown>,
	})

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
