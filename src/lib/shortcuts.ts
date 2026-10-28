/** "Cmd" on Apple platforms, "Ctrl" elsewhere (used in tooltips). */
export const MOD: 'Cmd' | 'Ctrl' = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent) ? 'Cmd' : 'Ctrl'
export const isMod = (e: { metaKey: boolean; ctrlKey: boolean }): boolean => e.metaKey || e.ctrlKey
