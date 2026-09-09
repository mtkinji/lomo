import { moneyPlaidDiagnostic } from './moneyPlaidDiagnostics';
it('keeps only bounded diagnostic fields and never credentials or bank metadata',()=> {
  expect(moneyPlaidDiagnostic('ERROR',{linkSessionId:'01234567-89ab-cdef-0123-456789abcdef',errorCode:'ITEM_LOGIN_REQUIRED',errorMessage:'private',accountNumberMask:'1234',institutionSearchQuery:'private',metadataJson:'private',publicToken:'private'})).toEqual({event:'ERROR',linkSessionId:'01234567-89ab-cdef-0123-456789abcdef',errorCode:'ITEM_LOGIN_REQUIRED'});
  expect(moneyPlaidDiagnostic('SEARCH_INSTITUTION',{institutionSearchQuery:'private'})).toBeNull();
  expect(moneyPlaidDiagnostic('ERROR',{linkSessionId:'access-production-private',errorCode:'sensitive words'})).toEqual({event:'ERROR'});
});
