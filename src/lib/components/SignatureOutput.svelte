<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { SignatureResult } from '$lib/types.js';

	interface Props {
		result: SignatureResult;
	}

	let { result }: Props = $props();

	let copied = $state(false);

	const jsonBlob = $derived(JSON.stringify(result, null, 2));

	async function copyToClipboard() {
		await navigator.clipboard.writeText(jsonBlob);
		copied = true;
		setTimeout(() => { copied = false; }, 2000);
	}

	function downloadJson() {
		const blob = new Blob([jsonBlob], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `signature-${result.signer.slice(0, 8)}-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="text-sm">Signature Result</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		<div class="space-y-2">
			<div class="text-muted-foreground text-xs">Signer</div>
			<div class="font-mono text-xs break-all">{result.signer}</div>
		</div>

		<div class="min-w-0 space-y-2">
			<div class="text-muted-foreground text-xs">Signature value</div>
			<div class="bg-muted space-y-1 overflow-x-auto rounded-md p-3 font-mono text-[0.6rem]">
				<div class="whitespace-nowrap"><span class="text-muted-foreground">r:</span> {result.signature.r}</div>
				<div class="whitespace-nowrap"><span class="text-muted-foreground">s:</span> {result.signature.s}</div>
				<div class="whitespace-nowrap"><span class="text-muted-foreground">v:</span> {result.signature.v}</div>
			</div>
		</div>

		<div class="min-w-0 space-y-2">
			<div class="text-muted-foreground text-xs">Signature JSON</div>
			<pre class="bg-muted max-h-48 max-w-full overflow-auto rounded-md p-3 font-mono text-[0.6rem]">{jsonBlob}</pre>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={copyToClipboard}>
				{copied ? 'Copied!' : 'Copy JSON'}
			</Button>
			<Button variant="outline" size="sm" onclick={downloadJson}>
				Download .json
			</Button>
		</div>
	</CardContent>
</Card>
