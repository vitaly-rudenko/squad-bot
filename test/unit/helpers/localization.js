/** @type {import('../../../src/types').Dependencies['localize']} */
export function localizeMock(locale, key, parameters) {
  if (parameters && Object.keys(parameters).length > 0) {
    return `${key}(${locale}):${
      Object.entries(parameters)
        .flatMap(([key, value]) => `${key}: ${value === '' ? "''" : String(value).replaceAll('\n', '\n  ')}`)
        .map(line => `\n  ${line}`)
        .join('')
    }`
  }

  return `${key}(${locale})`
}
