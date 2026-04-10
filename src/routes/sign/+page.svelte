<script lang="ts">
	import { page } from '$app/state';
	import { decodeSession, sessionToFormValues } from '$lib/session.js';
	import ConnectWallet from '$lib/components/ConnectWallet.svelte';
	import PayloadForm from '$lib/components/PayloadForm.svelte';
	import EIP712Preview from '$lib/components/EIP712Preview.svelte';
	import SignButton from '$lib/components/SignButton.svelte';
	import SignatureOutput from '$lib/components/SignatureOutput.svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { getWallet } from '$lib/wallet.svelte.js';
	import { getActionDef } from '$lib/eip712.js';
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
	let canSign = $derived(wallet.connected && hasSession && isFormValid(formErrors));

	async function handleSign() {
		if (!wallet.client || !wallet.address || !hasSession) return;
		signing = true;
		signError = null;
		result = null;
		try {
			result = await signMultisig(wallet.provider, wallet.address, values);
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
		<div>
			<h1 class="text-2xl font-bold">Sign Multisig Transaction</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				Session created by
				<span class="font-mono">{session?.createdBy.slice(0, 10)}...</span>
				on {new Date(session?.createdAt ?? 0).toLocaleString()}
			</p>
		</div>

		<Alert class="border-blue-800 bg-blue-950/50">
			<AlertDescription class="text-blue-200">
				This payload is locked by the coordinator. Connect your wallet and sign
				below.
			</AlertDescription>
		</Alert>

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
						<CardTitle class="text-sm">2. Payload (locked)</CardTitle>
					</CardHeader>
					<CardContent>
						<PayloadForm bind:values bind:errors locked />
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
	</div>
{/if}
