<script lang="ts">
	import ConnectWallet from '$lib/components/ConnectWallet.svelte';
	import WarningBanner from '$lib/components/WarningBanner.svelte';
	import PayloadForm from '$lib/components/PayloadForm.svelte';
	import EIP712Preview from '$lib/components/EIP712Preview.svelte';
	import SignButton from '$lib/components/SignButton.svelte';
	import SignatureOutput from '$lib/components/SignatureOutput.svelte';
	import CoordinatorHelper from '$lib/components/CoordinatorHelper.svelte';
	import SessionShare from '$lib/components/SessionShare.svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card/index.js';
	import { getWallet } from '$lib/wallet.svelte.js';
	import { getActionDef } from '$lib/eip712.js';
	import { signMultisig } from '$lib/signing.js';
	import { validateForm, isFormValid } from '$lib/validation.js';
	import type { FormValues, SignatureResult } from '$lib/types.js';

	const wallet = getWallet();

	let values = $state<FormValues>({
		actionType: 'approveAgent',
		multisigAddress: '',
		network: 'Mainnet',
		vaultAddress: '',
		fields: { agentAddress: '', agentName: '', nonce: '' },
	});
	let errors = $state<Record<string, string | null>>({ multisigAddress: null });
	let result = $state<SignatureResult | null>(null);
	let signError = $state<string | null>(null);
	let signing = $state(false);

	let actionDef = $derived(getActionDef(values.actionType));
	let formErrors = $derived(validateForm(values, actionDef));
	let canSign = $derived(wallet.connected && isFormValid(formErrors));

	async function handleSign() {
		if (!wallet.client || !wallet.address) return;
		signing = true;
		signError = null;
		result = null;
		try {
			result = await signMultisig(wallet.client, wallet.address, values);
		} catch (err) {
			signError = err instanceof Error ? err.message : 'Signing failed';
		} finally {
			signing = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">HL Multisig Signer</h1>
		<p class="text-muted-foreground mt-1 text-sm">
			Sign Hyperliquid multisig transactions with Rabby or MetaMask
		</p>
	</div>

	<WarningBanner />

	<div class="grid gap-6 lg:grid-cols-2">
		<div class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle class="text-sm">1. Connect Wallet</CardTitle>
				</CardHeader>
				<CardContent>
					<ConnectWallet />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle class="text-sm">2. Payload</CardTitle>
				</CardHeader>
				<CardContent>
					<PayloadForm bind:values bind:errors />
				</CardContent>
			</Card>
		</div>
		<Card>
			<CardHeader>
				<CardTitle class="text-sm">EIP-712 Preview</CardTitle>
			</CardHeader>
			<CardContent>
				<EIP712Preview {values} />
			</CardContent>
		</Card>
	</div>

	<SessionShare {values} disabled={!canSign} />
	<SignButton disabled={!canSign} {signing} onclick={handleSign} />
	{#if signError}
		<div
			class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{signError}
		</div>
	{/if}
	{#if result}
		<SignatureOutput {result} />
	{/if}
	<CoordinatorHelper />
</div>
