const SOURCE_FLOW_STEWARDS = new Set(['monny', 'sunshine', 'bingle', 'omar', 'pia']);

export function canStewardSourceFlow(profile: string) {
  return SOURCE_FLOW_STEWARDS.has(profile.trim().toLowerCase());
}
