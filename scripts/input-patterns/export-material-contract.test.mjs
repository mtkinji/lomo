import test from 'node:test';
import assert from 'node:assert/strict';
import {assertMaterialContractCurrent, buildInputMaterialContract} from './export-material-contract.mjs';

test('rejects a stale cross-client material snapshot after a token or schema change', async () => {
  const expected = await buildInputMaterialContract();
  assert.doesNotThrow(() => assertMaterialContractCurrent(structuredClone(expected), expected));
  const stale = structuredClone(expected);
  stale.css['--kw-input-fill'] = '#000000';
  assert.throws(() => assertMaterialContractCurrent(stale, expected), /stale/);
  assert.throws(() => assertMaterialContractCurrent({...expected, schemaVersion: 0}, expected), /stale/);
});
