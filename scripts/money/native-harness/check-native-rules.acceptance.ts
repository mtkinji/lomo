import { openRuleFixture, reloadRuleSnapshot, saveRuleFixture } from './rules';
import { fetch as nodeFetch } from 'cross-fetch';
const http = nodeFetch as unknown as typeof fetch;

it('feeds the native rule screen full descriptions and reloads durable rule results', async () => {
  const partial = await openRuleFixture('partial', http);
  const transaction = partial.snapshot.transactions.find(row => row.id === partial.transactionId)!;
  expect(transaction.originalDescription).toContain('Taylor Example');
  expect(transaction.categoryId).toBeTruthy();
  expect(transaction.matchSource).toBe('corrected');
  const category = partial.snapshot.categories.find(row => row.id === transaction.categoryId)!;
  await saveRuleFixture({ transactionId: transaction.id, merchantName: transaction.merchantName,
    originalDescription: transaction.originalDescription, categoryId: category.sourceId,
    matchMode: 'partial', merchantPattern: 'Taylor Example' });
  expect((await reloadRuleSnapshot()).transactions.find(row => row.id === transaction.id)?.merchantRuleCategoryId).toBeTruthy();

  const transfer = await openRuleFixture('transfer', http);
  const transferRow = transfer.snapshot.transactions.find(row => row.id === transfer.transactionId)!;
  expect(transferRow.moneyMeaning).toBe('transfer');
  await saveRuleFixture({ transactionId: transferRow.id, merchantName: transferRow.merchantName, targetKind: 'transfer' });
  const reopened = await openRuleFixture('transfer', http);
  expect(reopened.snapshot.transactions.find(row => row.id === transferRow.id)?.merchantRuleMeaning).toBe('transfer');
}, 20000);
