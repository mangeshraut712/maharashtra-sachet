export const CWC_DISABLED_REASON = 'CWC adapter unavailable: the public endpoint schema and warning semantics have not been verified. Official CWC CAP messages can still arrive through SACHET.'

export async function collectCwc() {
  const error = new Error(CWC_DISABLED_REASON)
  error.code = 'SOURCE_DISABLED'
  throw error
}
