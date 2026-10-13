/** The POST may have reached a paid provider; retrying cannot be assumed safe. */
export const unknownGenerationOutcome = (error: unknown): Error & { generationOutcomeUnknown: true } =>
  Object.assign(error instanceof Error ? error : new Error(String(error)), { generationOutcomeUnknown: true as const });

export const isUnknownGenerationOutcome = (error: unknown): boolean =>
  !!error && typeof error === 'object' && (error as { generationOutcomeUnknown?: boolean }).generationOutcomeUnknown === true;
