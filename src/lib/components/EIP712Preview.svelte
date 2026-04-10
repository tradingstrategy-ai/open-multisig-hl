<script lang="ts">
	import { getWallet } from '$lib/wallet.svelte.js';
	import { buildSignTypedDataParams, getActionDef } from '$lib/eip712.js';
	import type { FormValues } from '$lib/types.js';

	interface Props {
		values: FormValues;
	}

	let { values }: Props = $props();

	const wallet = getWallet();

	function serializeForDisplay(obj: unknown): unknown {
		if (obj === null || obj === undefined) return obj;
		if (typeof obj === 'bigint') return obj.toString();
		if (obj instanceof Uint8Array) {
			return '0x' + Array.from(obj).map((b) => b.toString(16).padStart(2, '0')).join('');
		}
		if (Array.isArray(obj)) return obj.map(serializeForDisplay);
		if (typeof obj === 'object') {
			const result: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(obj)) {
				result[key] = serializeForDisplay(value);
			}
			return result;
		}
		return obj;
	}

	const preview = $derived.by(() => {
		const signerAddress = wallet.address || '0x0000000000000000000000000000000000000000';
		try {
			const params = buildSignTypedDataParams(values, signerAddress);
			return {
				domain: serializeForDisplay(params.domain),
				types: serializeForDisplay(params.types),
				primaryType: params.primaryType,
				message: serializeForDisplay(params.message),
			};
		} catch {
			return null;
		}
	});

	const actionDef = $derived(getActionDef(values.actionType));
</script>

{#if actionDef.signingMode === 'l1'}
	<p class="text-muted-foreground mb-2 text-[0.65rem]">L1 Phantom Agent</p>
{/if}
{#if preview}
	<pre class="bg-muted overflow-auto rounded-md p-3 font-mono leading-relaxed text-[0.6rem]">{JSON.stringify(preview, null, 2)}</pre>
{:else}
	<p class="text-muted-foreground text-[0.65rem]">Fill in the form to see the EIP-712 preview.</p>
{/if}
