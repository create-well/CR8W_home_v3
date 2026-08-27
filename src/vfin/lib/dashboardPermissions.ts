export const SOURCE_FLOW_STEWARDS = ['monny', 'sunshine', 'bingle', 'omar', 'pia'] as const;

export type SourceFlowSteward = (typeof SOURCE_FLOW_STEWARDS)[number];

export function canStewardSourceFlow(username: string | null | undefined): boolean {
  return Boolean(username && SOURCE_FLOW_STEWARDS.includes(username.toLowerCase() as SourceFlowSteward));
}

export function canViewSourceFlow(username: string | null | undefined): boolean {
  return canStewardSourceFlow(username);
}
