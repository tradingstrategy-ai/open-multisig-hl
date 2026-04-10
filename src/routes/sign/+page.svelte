<script lang="ts">
	import { page } from '$app/state';
	import { asset } from '$app/paths';
	import { decodeSession, sessionToFormValues } from '$lib/session.js';
	import ConnectWallet from '$lib/components/ConnectWallet.svelte';
	import PayloadForm from '$lib/components/PayloadForm.svelte';
	import EIP712Preview from '$lib/components/EIP712Preview.svelte';
	import SignButton from '$lib/components/SignButton.svelte';
	import SignatureOutput from '$lib/components/SignatureOutput.svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import WrongChainAlert from '$lib/components/WrongChainAlert.svelte';
	import BalanceBox from '$lib/components/BalanceBox.svelte';
	import NetworkSwitch from '$lib/components/NetworkSwitch.svelte';
	import { getWallet } from '$lib/wallet.svelte.js';
	import { getActionDef } from '$lib/eip712.js';
	import { HYPERCORE_SIGNING_CHAIN_ID } from '$lib/chains.js';
	import { signMultisig } from '$lib/signing.js';
	import { validateForm, isFormValid } from '$lib/validation.js';
	import type { FormValues, SignatureResult } from '$lib/types.js';

	const wallet = getWallet();

	const encoded = page.url.searchParams.get('s') || '';
	const session = encoded ? decodeSession(encoded) : null;
	let values = $state<FormValues>(
		session ? sessionToFormValues(session) : ({} as FormValues)
	);
	let hasSession = session !== null;
	let errors = $state<Record<string, string | null>>({});

	let result = $state<SignatureResult | null>(null);
	let signError = $state<string | null>(null);
	let signing = $state(false);

	let actionDef = $derived(hasSession ? getActionDef(values.actionType) : null);
	let formErrors = $derived(
		hasSession && actionDef ? validateForm(values, actionDef) : {}
	);
	// See chains.ts — Hyperliquid's EIP-712 domain uses Arbitrum Sepolia as a
	// protocol constant because Hyperliquid was built on the Arbitrum stack.
	let requiredChainId = HYPERCORE_SIGNING_CHAIN_ID;
	let canSign = $derived(
		wallet.connected && hasSession && isFormValid(formErrors),
	);

	async function handleSign() {
		const provider = wallet.provider;
		const addr = wallet.address;
		if (!wallet.client || !addr || !provider || !hasSession) return;
		signing = true;
		signError = null;
		result = null;
		try {
			result = await signMultisig(provider, addr, values);
		} catch (err) {
			signError = err instanceof Error ? err.message : 'Signing failed';
		} finally {
			signing = false;
		}
	}
</script>

{#if !hasSession}
	<Alert variant="destructive">
		<AlertDescription>
			Invalid or missing session. Ask the coordinator for a new link.
		</AlertDescription>
	</Alert>
{:else}
	<div class="space-y-6">
		<div class="flex items-start justify-between gap-4">
			<div class="flex items-center gap-3">
				<img src={asset('/trading-strategy-logo.svg')} alt="Trading Strategy" class="h-8" />
				<div>
					<h1 class="text-2xl font-bold">Sign Multisig Transaction</h1>
					<p class="text-muted-foreground mt-1 text-sm">
						Session created by
						<span class="font-mono">{session?.createdBy.slice(0, 10)}...</span>
						on {new Date(session?.createdAt ?? 0).toLocaleString()}
					</p>
				</div>
			</div>
			<NetworkSwitch network={values.network} onchange={() => {}} disabled />
		</div>

		<WrongChainAlert {requiredChainId} />

		<Alert class="border-blue-800 bg-blue-950/50">
			<AlertDescription class="text-blue-200">
				This payload is locked by the coordinator. Connect your wallet and sign
				below.
			</AlertDescription>
		</Alert>

		<div class="grid gap-6 lg:grid-cols-2">
			<div class="min-w-0 space-y-4">
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
						<CardTitle class="text-sm">2. Payload (locked)</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<PayloadForm bind:values bind:errors locked />
						<SignButton disabled={!canSign} {signing} onclick={handleSign} />
						{#if signError}
							<div
								class="rounded-md border border-destructive px-4 py-3 text-sm text-destructive"
							>
								{signError}
							</div>
						{/if}
						{#if result}
							<SignatureOutput {result} />
						{/if}
					</CardContent>
				</Card>
				<BalanceBox
					multisigAddress={values.multisigAddress}
					signerAddress={wallet.address ?? ''}
					network={values.network}
				/>
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
	</div>
{/if}
