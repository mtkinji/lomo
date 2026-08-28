import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, 'MoneyAccountsScreen.tsx'), 'utf8');

describe('Money Accounts connection control', () => {
  it('keeps repair provider-owned and targeted to the exact connection', () => {
    expect(source).toContain('startMoneyPlaidRepair(connection.id)');
    expect(source).toContain('Repair connection');
    expect(source).toContain('reconcileConnectedActivity');
  });

  it('requires destructive native confirmation before disconnecting', () => {
    expect(source).toContain('Alert.alert(');
    expect(source).toContain("style: 'destructive'");
    expect(source).toContain('disconnectConnection(connection.id)');
    expect(source).toContain('Existing Money history stays in Kwilt.');
  });

  it('gives every connection menu an accessible institution-specific label', () => {
    expect(source).toContain('Manage ${connection.institutionName} connection');
    expect(source).toContain('Disconnect ${connection.institutionName}');
  });
});
