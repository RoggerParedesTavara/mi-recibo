export function authenticateLocalUser(username: string, password: string): boolean {
  return username.trim().toLowerCase() === 'coral' && password === 'coral';
}
