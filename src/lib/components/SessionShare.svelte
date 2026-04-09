<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { createSession, buildShareUrl } from '$lib/session.js';
	import { getWallet } from '$lib/wallet.svelte.js';
	import type { FormValues } from '$lib/types.js';

	interface Props {
		values: FormValues;
		disabled: boolean;
	}

	let { values, disabled }: Props = $props();

	const wallet = getWallet();
	let shareUrl = $state('');
	let copied = $state(false);

	function createSigningSession() {
		const createdBy = wallet.address || '0x0000000000000000000000000000000000000000';
		const session = createSession(values, createdBy);
		shareUrl = buildShareUrl(session);
	}

	async function copyUrl() {
		await navigator.clipboard.writeText(shareUrl);
		copied = true;
		setTimeout(() => { copied = false; }, 2000);
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="text-sm">Share Signing Session</CardTitle>
	</CardHeader>
	<CardContent class="space-y-3">
		{#if !shareUrl}
			<p class="text-muted-foreground text-xs">
				Create a shareable link so other signers can sign the exact same payload.
			</p>
			<Button variant="outline" {disabled} onclick={createSigningSession}>
				Create Signing Session
			</Button>
		{:else}
			<div class="flex gap-2">
				<Input value={shareUrl} readonly class="font-mono text-xs" />
				<Button variant="outline" size="sm" onclick={copyUrl}>
					{copied ? 'Copied!' : 'Copy'}
				</Button>
			</div>
		{/if}
	</CardContent>
</Card>
