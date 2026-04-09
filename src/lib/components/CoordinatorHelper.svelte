<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import type { SignatureResult, CoordinatorBundle } from '$lib/types.js';
	import { getActionDef } from '$lib/eip712.js';

	let expanded = $state(false);
	let input = $state('');
	let parsed = $state<SignatureResult[] | null>(null);
	let parseError = $state<string | null>(null);
	let mismatchWarnings = $state<string[]>([]);

	function toggle() {
		expanded = !expanded;
	}

	function validateAndParse() {
		parseError = null;
		parsed = null;
		mismatchWarnings = [];

		if (!input.trim()) {
			parseError = 'Paste signature JSON(s) above.';
			return;
		}

		let sigs: SignatureResult[];
		try {
			const raw = JSON.parse(input.trim());
			if (Array.isArray(raw)) {
				sigs = raw as SignatureResult[];
			} else if (typeof raw === 'object' && raw !== null && raw.signer) {
				sigs = [raw as SignatureResult];
			} else {
				parseError = 'Expected a signature object or array of signature objects.';
				return;
			}
		} catch {
			// Try parsing multiple JSON objects separated by newlines/commas
			try {
				const wrapped = '[' + input.trim().replace(/\}\s*\{/g, '},{') + ']';
				sigs = JSON.parse(wrapped) as SignatureResult[];
			} catch {
				parseError = 'Invalid JSON. Paste a signature object or array.';
				return;
			}
		}

		if (sigs.length === 0) {
			parseError = 'No signatures found.';
			return;
		}

		// Validate all have required fields
		for (let i = 0; i < sigs.length; i++) {
			const sig = sigs[i];
			if (!sig.signer || !sig.signature || !sig.payload) {
				parseError = `Signature #${i + 1} is missing required fields (signer, signature, payload).`;
				return;
			}
		}

		// Check consistency across all signatures
		const ref = sigs[0].payload;
		const warnings: string[] = [];
		for (let i = 1; i < sigs.length; i++) {
			const p = sigs[i].payload;
			if (p.type !== ref.type) warnings.push(`Sig #${i + 1}: action type "${p.type}" differs from #1 "${ref.type}"`);
			if (p.multisigAddress !== ref.multisigAddress) warnings.push(`Sig #${i + 1}: multisig address differs`);
			if (p.network !== ref.network) warnings.push(`Sig #${i + 1}: network "${p.network}" differs from #1 "${ref.network}"`);
			// Check fields
			for (const [key, val] of Object.entries(ref.fields)) {
				if (String(p.fields[key]) !== String(val)) {
					warnings.push(`Sig #${i + 1}: field "${key}" value differs`);
				}
			}
		}

		mismatchWarnings = warnings;
		parsed = sigs;
	}

	function exportBundle() {
		if (!parsed || parsed.length === 0) return;

		const ref = parsed[0].payload;
		const actionDef = getActionDef(ref.type);

		// Build inner action from payload fields
		let innerAction: Record<string, unknown>;
		if (actionDef.buildAction) {
			innerAction = actionDef.buildAction(ref.fields as Record<string, string>);
		} else {
			innerAction = { ...ref.fields };
		}

		const bundle: CoordinatorBundle = {
			signatures: parsed.map((s) => s.signature),
			inner_action: innerAction,
			multisig_user: ref.multisigAddress,
			network: ref.network,
		};

		const json = JSON.stringify(bundle, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `bundle-${ref.type}-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<Card>
	<CardHeader>
		<button
			class="flex w-full items-center justify-between text-left"
			onclick={toggle}
		>
			<CardTitle class="text-sm">Coordinator: Collect & Bundle Signatures</CardTitle>
			<span class="text-muted-foreground text-xs">{expanded ? '[-]' : '[+]'}</span>
		</button>
	</CardHeader>

	{#if expanded}
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<p class="text-muted-foreground text-xs">
					Paste signature JSONs below (array or individual objects).
				</p>
				<Textarea
					placeholder={'[{"signer":"0x...","signature":{...},"payload":{...}}, ...]'}
					bind:value={input}
					rows={6}
					class="font-mono text-xs"
				/>
			</div>

			<Button variant="outline" size="sm" onclick={validateAndParse}>
				Validate & Parse
			</Button>

			{#if parseError}
				<Alert variant="destructive">
					<AlertDescription>{parseError}</AlertDescription>
				</Alert>
			{/if}

			{#if mismatchWarnings.length > 0}
				<Alert class="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/50">
					<AlertDescription>
						<ul class="list-disc space-y-1 pl-4 text-xs">
							{#each mismatchWarnings as warning, i (i)}
								<li>{warning}</li>
							{/each}
						</ul>
					</AlertDescription>
				</Alert>
			{/if}

			{#if parsed}
				<div class="space-y-2">
					<p class="text-sm">
						Parsed <strong>{parsed.length}</strong> signature{parsed.length !== 1 ? 's' : ''} from
						{#each parsed as sig, i (sig.signer)}
							<span class="font-mono text-xs">{sig.signer.slice(0, 8)}...</span>{i < parsed.length - 1 ? ', ' : ''}
						{/each}
					</p>
					<Button variant="default" size="sm" onclick={exportBundle}>
						Export Bundle
					</Button>
				</div>
			{/if}
		</CardContent>
	{/if}
</Card>
