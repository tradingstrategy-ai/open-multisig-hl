<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Select,
		SelectContent,
		SelectGroup,
		SelectGroupHeading,
		SelectItem,
		SelectTrigger,
	} from '$lib/components/ui/select/index.js';
	import { ACTION_REGISTRY, getAllActions, getActionDef } from '$lib/eip712.js';
	import { validateField, validateAddress } from '$lib/validation.js';
	import type { FormValues, ActionType, FieldDef } from '$lib/types.js';

	interface Props {
		values: FormValues;
		errors: Record<string, string | null>;
		locked?: boolean;
	}

	let { values = $bindable(), errors = $bindable(), locked = false }: Props = $props();

	const allActions = getAllActions();
	const userSignedActions = $derived(allActions.filter((a) => a.signingMode === 'user-signed'));
	const l1Actions = $derived(allActions.filter((a) => a.signingMode === 'l1'));
	const actionDef = $derived(getActionDef(values.actionType));

	// Track select value for shadcn Select (uses string value)
	let selectValue = $state(values.actionType as string);

	function updateActionType(type: string) {
		const actionType = type as ActionType;
		const def = getActionDef(actionType);
		const newFields: Record<string, string> = {};
		for (const field of def.fields) {
			newFields[field.name] = '';
		}
		values = {
			...values,
			actionType,
			fields: newFields,
		};
		errors = {};
		selectValue = type;
	}

	function updateField(name: string, value: string) {
		values = {
			...values,
			fields: { ...values.fields, [name]: value },
		};
		// Find the field def and validate
		const fieldDef = actionDef.fields.find((f) => f.name === name);
		if (fieldDef) {
			errors = { ...errors, [name]: validateField(value, fieldDef.eip712Type, fieldDef.required) };
		}
	}

	function updateMultisigAddress(value: string) {
		values = { ...values, multisigAddress: value };
		errors = { ...errors, multisigAddress: validateAddress(value) };
	}

	function fillNow(fieldName: string) {
		updateField(fieldName, Date.now().toString());
	}

	function setBoolField(fieldName: string, val: boolean) {
		updateField(fieldName, val.toString());
	}
</script>

<div class="space-y-5">
	<!-- Action Type Selector -->
	<div class="space-y-2">
		<Label>Action Type</Label>
		<Select
			type="single"
			value={selectValue}
			onValueChange={(v) => { if (v) updateActionType(v); }}
			disabled={locked}
		>
			<SelectTrigger class="w-full">
				{actionDef.label}
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectGroupHeading>User-Signed (EIP-712)</SelectGroupHeading>
					{#each userSignedActions as action (action.type)}
						<SelectItem value={action.type} label={action.label} />
					{/each}
				</SelectGroup>
				<SelectGroup>
					<SelectGroupHeading>L1 Actions (Phantom Agent)</SelectGroupHeading>
					{#each l1Actions as action (action.type)}
						<SelectItem value={action.type} label={action.label} />
					{/each}
				</SelectGroup>
			</SelectContent>
		</Select>
		<p class="text-muted-foreground text-xs">{actionDef.description}</p>
	</div>

	<!-- Signing Mode Badge -->
	<div>
		<Badge variant={actionDef.signingMode === 'l1' ? 'secondary' : 'default'}>
			{actionDef.signingMode === 'l1' ? 'L1 Phantom Agent' : 'EIP-712 Direct'}
		</Badge>
	</div>

	<!-- Multisig Address -->
	<div class="space-y-2">
		<Label for="multisigAddress">Multisig Address</Label>
		<Input
			id="multisigAddress"
			placeholder="0x..."
			value={values.multisigAddress}
			oninput={(e) => updateMultisigAddress(e.currentTarget.value)}
			disabled={locked}
			class="font-mono text-xs"
		/>
		{#if errors.multisigAddress}
			<p class="text-destructive text-xs">{errors.multisigAddress}</p>
		{/if}
	</div>

	<!-- Dynamic Fields -->
	{#each actionDef.fields as field (field.name)}
		<div class="space-y-2">
			<Label for={field.name}>
				{field.label}
				{#if field.required}
					<span class="text-destructive">*</span>
				{/if}
			</Label>

			{#if field.eip712Type === 'bool'}
				<!-- Boolean toggle buttons -->
				<div class="flex gap-1">
					<Button
						variant={values.fields[field.name] === 'true' ? 'default' : 'outline'}
						size="sm"
						disabled={locked}
						onclick={() => setBoolField(field.name, true)}
					>
						Yes
					</Button>
					<Button
						variant={values.fields[field.name] === 'false' ? 'default' : 'outline'}
						size="sm"
						disabled={locked}
						onclick={() => setBoolField(field.name, false)}
					>
						No
					</Button>
				</div>
			{:else if field.eip712Type === 'json'}
				<!-- JSON textarea -->
				<Textarea
					id={field.name}
					placeholder={field.placeholder}
					value={values.fields[field.name] ?? ''}
					oninput={(e) => updateField(field.name, e.currentTarget.value)}
					disabled={locked}
					class="font-mono text-xs"
					rows={4}
				/>
			{:else if field.eip712Type === 'uint64'}
				<!-- Nonce/timestamp with "Now" button -->
				<div class="flex gap-2">
					<Input
						id={field.name}
						placeholder={field.placeholder}
						value={values.fields[field.name] ?? ''}
						oninput={(e) => updateField(field.name, e.currentTarget.value)}
						disabled={locked}
						class={field.mono ? 'font-mono text-xs' : ''}
					/>
					<Button
						variant="outline"
						size="sm"
						disabled={locked}
						onclick={() => fillNow(field.name)}
					>
						Now (ms)
					</Button>
				</div>
			{:else}
				<!-- Standard text input -->
				<Input
					id={field.name}
					placeholder={field.placeholder}
					value={values.fields[field.name] ?? ''}
					oninput={(e) => updateField(field.name, e.currentTarget.value)}
					disabled={locked}
					class={field.mono ? 'font-mono text-xs' : ''}
				/>
			{/if}

			{#if field.help}
				<p class="text-muted-foreground text-xs">{field.help}</p>
			{/if}
			{#if errors[field.name]}
				<p class="text-destructive text-xs">{errors[field.name]}</p>
			{/if}
		</div>
	{/each}
</div>
