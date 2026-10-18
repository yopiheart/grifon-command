export function isExpectedBootConsoleError(message: string, locationUrl: string): boolean {
  try {
    return new URL(locationUrl).origin === 'http://localhost:54321'
      && /Failed to (load|fetch)|net::ERR|ERR_CONNECTION/i.test(message);
  } catch {
    return false;
  }
}
