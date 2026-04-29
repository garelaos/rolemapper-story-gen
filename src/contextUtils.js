export function parseWorkflows(text) {
  return text.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
    .map(s => ({ value: s, label: s }));
}

export function parsePersonas(text) {
  return text.split('\n').map(s => {
    const name = s.split(/\s+[—–-]\s+/)[0].trim();
    return name ? { value: name, label: name } : null;
  }).filter(Boolean);
}

export function parsePhases(text) {
  return text.split(',').map(s => s.trim()).filter(Boolean)
    .map(s => ({ value: s, label: s }));
}

export function buildContext(ctx) {
  return [
    `**Platform overview**\n${ctx.platformOverview}`,
    `**Key workflows or modules**\n${ctx.keyWorkflows}`,
    `**Primary personas**\n${ctx.personas}`,
    `**Current phase scope**\n${ctx.phaseScope}`,
    ctx.complianceContext ? `**Compliance or regulatory context**\n${ctx.complianceContext}` : '',
    ctx.terminology ? `**Key terminology**\n${ctx.terminology}` : '',
  ].filter(Boolean).join('\n\n');
}
