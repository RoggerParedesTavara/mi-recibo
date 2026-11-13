import { authenticateLocalUser } from './authenticateLocalUser';

describe('authenticateLocalUser', () => {
  it('accepts the requested local development credentials', () => {
    expect(authenticateLocalUser('coral', 'coral')).toBe(true);
    expect(authenticateLocalUser(' CORAL ', 'coral')).toBe(true);
  });

  it('rejects a wrong username or password', () => {
    expect(authenticateLocalUser('coral', 'wrong')).toBe(false);
    expect(authenticateLocalUser('someone', 'coral')).toBe(false);
  });
});
