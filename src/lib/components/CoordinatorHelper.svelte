<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import type { SignatureResult, CoordinatorBundle } from '$lib/types.js';
	import { getActionDef } from '$lib/eip712.js';
	import { executeBundle, canonicalizePayloadAction } from '$lib/execute.js';
	import { buildL1FormSigningContext, formValuesFromSignaturePayload } from '$lib/l1context.js';
	import { getWallet } from '$lib/wallet.svelte.js';

	const wallet = getWallet();

	let expanded = $state(false);
	let input = $state('');
	let parsed = $state<SignatureResult[] | null>(null);
	let parseError = $state<string | null>(null);
	let mismatchWarnings = $state<string[]>([]);
	let executing = $state(false);
	let executeResult = $state<{ success: boolean; response: unknown; requestBody: unknown } | null>(null);
	let executeError = $state<string | null>(null);
	let copiedPreview = $state(false);

	const unsignedRequestPreview = $derived.by(() => {
		if (!parsed || parsed.length === 0) return null;
		try {
			return buildUnsignedRequestBody();
		} catch {
			return null;
		}
	});

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
		if (!ref.outerSigner) {
			parseError = 'Signature #1 is missing payload.outerSigner. Ask signers to re-sign with the latest app version.';
			return;
		}
		for (let i = 1; i < sigs.length; i++) {
			const p = sigs[i].payload;
			if (!p.outerSigner) {
				parseError = `Signature #${i + 1} is missing payload.outerSigner. Ask signers to re-sign with the latest app version.`;
				return;
			}
			if (p.type !== ref.type) warnings.push(`Sig #${i + 1}: action type "${p.type}" differs from #1 "${ref.type}"`);
			if (p.multisigAddress !== ref.multisigAddress) warnings.push(`Sig #${i + 1}: multisig address differs`);
			if (p.outerSigner.toLowerCase() !== ref.outerSigner.toLowerCase()) warnings.push(`Sig #${i + 1}: outer signer differs`);
			if (p.network !== ref.network) warnings.push(`Sig #${i + 1}: network "${p.network}" differs from #1 "${ref.network}"`);
			// Check fields
			for (const [key, val] of Object.entries(ref.fields)) {
				if (String(p.fields[key]) !== String(val)) {
					warnings.push(`Sig #${i + 1}: field "${key}" value differs`);
				}
			}
		}

		if (ref.signingMode === 'l1') {
			const connectionIds = sigs
				.map((sig) => sig.connectionId)
				.filter((connectionId): connectionId is `0x${string}` => Boolean(connectionId));
			const distinctConnectionIds = new Set(connectionIds.map((connectionId) => connectionId.toLowerCase()));
			if (distinctConnectionIds.size > 1) {
				parseError = 'L1 signatures have different connectionId values. They were not signed for the same action/nonce.';
				return;
			}

			const expectedContext = buildL1FormSigningContext(
				formValuesFromSignaturePayload(ref),
				ref.outerSigner,
			);
			for (let i = 0; i < sigs.length; i++) {
				const signedConnectionId = sigs[i].connectionId;
				if (!signedConnectionId) {
					warnings.push(`Sig #${i + 1}: missing connectionId; ask signer to re-sign with the Ledger Direct build if validation is needed.`);
				} else if (signedConnectionId.toLowerCase() !== expectedContext.connectionId.toLowerCase()) {
					parseError = `Signature #${i + 1} was signed for connectionId ${signedConnectionId}, expected ${expectedContext.connectionId}.`;
					return;
				}
			}
		}

		mismatchWarnings = warnings;
		parsed = sigs;
	}

	function buildBundle(): CoordinatorBundle {
		if (!parsed || parsed.length === 0) throw new Error('No signatures parsed');
		const ref = parsed[0].payload;
		const actionDef = getActionDef(ref.type);
		let innerAction: Record<string, unknown>;
		if (actionDef.buildAction) {
			innerAction = actionDef.buildAction(ref.fields as Record<string, string>);
		} else {
			// Build inner action matching Python SDK field order.
			// As of SDK 0.23.0 (2026-04-14), the API requires signatureChainId and
			// hyperliquidChain to be present in the inner action of the multiSig payload.
			// Previously these were added only to the EIP-712 signing copy; now they
			// must also appear in the action dict that is posted.
			innerAction = {
				type: ref.type,
				signatureChainId: '0x66eee',
				hyperliquidChain: ref.network,
			};
			for (const field of actionDef.fields) {
				const raw = ref.fields[field.name] as string ?? '';
				switch (field.eip712Type) {
					case 'uint64':
						innerAction[field.name] = parseInt(raw, 10);
						break;
					case 'bool':
						innerAction[field.name] = raw === 'true';
						break;
					case 'address':
						innerAction[field.name] = raw.toLowerCase();
						break;
					default:
						innerAction[field.name] = raw;
				}
			}
		}

		return {
			signatures: parsed.map((s) => s.signature),
			inner_action: innerAction,
			multisig_user: ref.multisigAddress,
			network: ref.network,
			nonce: parseInt(ref.fields[actionDef.nonceField] as string ?? '0', 10),
		};
	}

	function trimSignature(sig: { r: string; s: string; v: number }) {
		const trimHex = (hex: string) => {
			const stripped = hex.slice(2).replace(/^0+/, '');
			return '0x' + (stripped || '0');
		};
		return { r: trimHex(sig.r), s: trimHex(sig.s), v: sig.v };
	}

	function buildUnsignedRequestBody() {
		if (!parsed || parsed.length === 0) throw new Error('No signatures parsed');
		const bundle = buildBundle();
		const outerSigner = parsed[0].payload.outerSigner;
		// Apply the same outer-envelope canonicalization that execute.ts uses,
		// so the preview JSON matches what gets signed and submitted.
		const payloadAction = canonicalizePayloadAction(bundle.inner_action);
		const multiSigAction = {
			type: 'multiSig',
			signatureChainId: '0x66eee',
			signatures: bundle.signatures.map(trimSignature),
			payload: {
				multiSigUser: bundle.multisig_user.toLowerCase(),
				outerSigner: outerSigner.toLowerCase(),
				action: payloadAction,
			},
		};

		return {
			action: multiSigAction,
			nonce: bundle.nonce,
			signature: '<outer signer signature is added during Execute>',
			vaultAddress: parsed[0].payload.vaultAddress || null,
			expiresAfter: null,
		};
	}

	async function copyPreview() {
		if (!unsignedRequestPreview) return;
		await navigator.clipboard.writeText(JSON.stringify(unsignedRequestPreview, null, 2));
		copiedPreview = true;
		setTimeout(() => { copiedPreview = false; }, 2000);
	}

	function exportBundle() {
		if (!parsed || parsed.length === 0) return;
		const bundle = buildBundle();
		const json = JSON.stringify(bundle, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `bundle-${parsed[0].payload.type}-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function execute() {
		if (!parsed || parsed.length === 0) return;
		if (!wallet.provider || !wallet.address) {
			executeError = 'Connect your wallet first.';
			return;
		}
		const committedOuterSigner = parsed[0]?.payload.outerSigner;
		if (!committedOuterSigner) {
			executeError = 'Signatures are missing payload.outerSigner. Ask signers to re-sign with the latest app version.';
			return;
		}
		if (wallet.address.toLowerCase() !== committedOuterSigner.toLowerCase()) {
			executeError = `Connect the outer signer wallet committed by the signatures: ${committedOuterSigner}. Current wallet: ${wallet.address}.`;
			return;
		}
		executing = true;
		executeError = null;
		executeResult = null;
		try {
			const bundle = buildBundle();
			const vaultAddress = parsed[0].payload.vaultAddress || null;
			const result = await executeBundle(wallet.provider, wallet.address, bundle, vaultAddress);
			executeResult = result;
		} catch (err) {
			executeError = err instanceof Error ? err.message : String(err);
		} finally {
			executing = false;
		}
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
					<div class="flex gap-2">
						<Button variant="outline" size="sm" onclick={exportBundle}>
							Export Bundle
						</Button>
						<Button variant="outline" size="sm" onclick={copyPreview} disabled={!unsignedRequestPreview}>
							{copiedPreview ? 'Copied!' : 'Copy Submit Preview'}
						</Button>
						<Button
							variant="default"
							size="sm"
							onclick={execute}
							disabled={executing || !wallet.connected}
						>
							{executing ? 'Executing…' : 'Execute'}
						</Button>
					</div>
				</div>

				{#if unsignedRequestPreview}
					<div class="space-y-2">
						<div class="text-muted-foreground text-xs">
							Final request preview before outer signer signature
						</div>
						<pre class="bg-muted max-h-72 overflow-auto rounded-md p-3 font-mono text-[0.6rem]">{JSON.stringify(unsignedRequestPreview, null, 2)}</pre>
					</div>
				{/if}
			{/if}

			{#if executeError}
				<Alert variant="destructive">
					<AlertDescription>{executeError}</AlertDescription>
				</Alert>
			{/if}

			{#if executeResult}
				<Alert class={executeResult.success ? 'border-green-500/50 bg-green-50 dark:bg-green-950/50' : 'border-red-500/50 bg-red-50 dark:bg-red-950/50'}>
					<AlertDescription>
						{#if executeResult.success}
							Transaction submitted successfully.
						{:else}
							<div class="space-y-2">
								<div>Submission failed: {JSON.stringify(executeResult.response)}</div>
								<div class="text-xs font-medium">Request body sent:</div>
								<pre class="overflow-auto text-xs">{JSON.stringify(executeResult.requestBody, null, 2)}</pre>
							</div>
						{/if}
					</AlertDescription>
				</Alert>
			{/if}
		</CardContent>
	{/if}
</Card>
