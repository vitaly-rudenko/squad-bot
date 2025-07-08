export function parseDescription(input?: string | undefined): { description: string | undefined; isTip: boolean } {
  if (!input) {
    return {
      isTip: false,
      description: undefined,
    }
  }

  // As defined in src/receipts/receipt-editor.tsx#L149
  const isTip = input.endsWith(' (tip)') || input === 'Tip'

  return isTip ? {
    isTip: true,
    description: input.endsWith(' (tip)') ? input.slice(0, -' (tip)'.length) : undefined,
  } : {
    isTip: false,
    description: input,
  }
}
