/**
 * Bridge between FormValues and URL search params.
 *
 * Because the fields a form exposes depend on the current actionType, the
 * schema is built dynamically per action. Top-level params (actionType,
 * multisigAddress, network, vaultAddress) are always present; dynamic field
 * params are added from the action definition.
 */

import type { ActionType, FormValues, Network } from './types'
import { getActionDef, getAllActions } from './eip712'
import {
	deserialiseSearchParams,
	serialiseSearchParams,
	type ParamSchema,
	type StateFromSchema,
} from './url-search-state'

const ALL_ACTION_TYPES = getAllActions().map((a) => a.type) as readonly ActionType[]
const NETWORKS = ['Mainnet', 'Testnet'] as const satisfies readonly Network[]

export const DEFAULT_ACTION_TYPE: ActionType = 'approveAgent'
export const DEFAULT_NETWORK: Network = 'Mainnet'

/** Build a URL param schema for a given action type. */
export function buildFormSchema(actionType: ActionType): ParamSchema {
	const actionDef = getActionDef(actionType)
	const schema: ParamSchema = {
		actionType: {
			type: 'string',
			defaultValue: DEFAULT_ACTION_TYPE,
			options: ALL_ACTION_TYPES,
		},
		multisigAddress: { type: 'string', defaultValue: '' },
		network: { type: 'string', defaultValue: DEFAULT_NETWORK, options: NETWORKS },
		vaultAddress: { type: 'string', defaultValue: '' },
	}
	for (const field of actionDef.fields) {
		schema[field.name] = { type: 'string', defaultValue: '' }
	}
	return schema
}

/** Build the default FormValues for a given action type (empty fields). */
export function defaultFormValues(actionType: ActionType = DEFAULT_ACTION_TYPE): FormValues {
	const actionDef = getActionDef(actionType)
	const fields: Record<string, string> = {}
	for (const field of actionDef.fields) {
		fields[field.name] = ''
	}
	return {
		actionType,
		multisigAddress: '',
		network: DEFAULT_NETWORK,
		vaultAddress: '',
		fields,
	}
}

/** Deserialise URL search params into a FormValues object. */
export function formValuesFromSearchParams(searchParams: URLSearchParams): FormValues {
	// First determine the actionType so we know which dynamic fields exist.
	const rawActionType = searchParams.get('actionType')
	const actionType: ActionType = ALL_ACTION_TYPES.includes(rawActionType as ActionType)
		? (rawActionType as ActionType)
		: DEFAULT_ACTION_TYPE

	const schema = buildFormSchema(actionType)
	const state = deserialiseSearchParams(searchParams, schema) as Record<string, string>

	const actionDef = getActionDef(actionType)
	const fields: Record<string, string> = {}
	for (const field of actionDef.fields) {
		fields[field.name] = state[field.name] ?? ''
	}

	return {
		actionType,
		multisigAddress: state.multisigAddress ?? '',
		network: (state.network as Network) ?? DEFAULT_NETWORK,
		vaultAddress: state.vaultAddress ?? '',
		fields,
	}
}

/** Serialise FormValues to a query string (without leading `?`). */
export function formValuesToQueryString(values: FormValues): string {
	const schema = buildFormSchema(values.actionType)
	const state: Record<string, string> = {
		actionType: values.actionType,
		multisigAddress: values.multisigAddress,
		network: values.network,
		vaultAddress: values.vaultAddress,
		...values.fields,
	}
	return serialiseSearchParams(state as StateFromSchema<typeof schema>, schema)
}
