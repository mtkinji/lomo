import type { ExternalControlCoverageRow } from '@kwilt/agent-runtime';
import type { UiParitySurface } from '../../capabilities/uiParityInventory';
import type { ChatCapabilityCoverageRow } from './chatCapabilityCoverage';
import {
  assertFinalConversationalParity,
  buildConversationalParity,
  validateConversationalParity,
} from './conversationalParity';

const SOURCE_PATH = 'src/features/unifiedChat/conversationalParity.test.ts';

function includedSurface(operationId = 'todos.read'): UiParitySurface {
  return {
    id: 'todos',
    title: 'To-dos',
    scope: 'included',
    scopeReason: null,
    routeRefs: ['ActivitiesList'],
    sourcePaths: [SOURCE_PATH],
    intents: [{ id: 'todos.read', label: 'Read To-dos', operationIds: [operationId as never] }],
    gaps: [],
  };
}

function excludedSurface(operationId = 'games.open'): UiParitySurface {
  return {
    id: 'games',
    title: 'Games',
    scope: 'excluded',
    scopeReason: 'Games is outside conversational control.',
    routeRefs: ['GamesShelf'],
    sourcePaths: [SOURCE_PATH],
    intents: [{ id: 'games.open', label: 'Open Games', operationIds: [operationId as never] }],
    gaps: [],
  };
}

function coverage(operationId = 'todos.read'): ChatCapabilityCoverageRow {
  return {
    id: operationId,
    owner: operationId.split('.')[0],
    effect: 'read',
    providers: ['device', 'server'],
    consequence: 'low',
    confirmation: 'none',
    toolIds: [operationId],
    sourceRefs: ['capability:todos'],
    returnBehavior: 'answer',
    completionMode: 'direct',
    requiredScopes: ['life.read'],
    receipt: { required: true, resultRefKinds: ['todos'], reversible: true, undoOperationId: null },
    supportedBoundary: { finalActOwner: 'kwilt', reason: null },
    toolCoverage: [{
      toolId: operationId,
      mobileHandler: true,
      serverHandler: true,
      externalExposure: true,
    }],
    channels: {
      mobile: { state: 'live', outcome: 'answer', proofPaths: [SOURCE_PATH], boundaryReason: null },
      phone: { state: 'live', outcome: 'server_execution', proofPaths: [SOURCE_PATH], boundaryReason: null },
    },
  };
}

function external(operationId = 'todos.read'): ExternalControlCoverageRow {
  return {
    operationId,
    owner: operationId.split('.')[0],
    state: 'exposed',
    toolIds: [operationId],
    reason: 'Scoped external action is executable.',
  };
}

describe('conversational parity', () => {
  it('projects one fully ready operation from UI, runtime, external, and voice facts', () => {
    const rows = buildConversationalParity({
      surfaces: [includedSurface()],
      coverage: [coverage()],
      externalCoverage: [external()],
      voiceConformanceOperationIds: ['todos.read'],
    });

    expect(rows).toEqual([expect.objectContaining({
      operationId: 'todos.read',
      surfaceId: 'todos',
      intentId: 'todos.read',
      completionMode: 'direct',
      mobile: 'ready',
      phone: 'ready',
      external: 'ready',
      voice: 'shared_runtime',
      proofPaths: [SOURCE_PATH],
    })]);
    expect(validateConversationalParity({ surfaces: [includedSurface()], rows })).toEqual([]);
    expect(() => assertFinalConversationalParity({ surfaces: [includedSurface()], rows })).not.toThrow();
  });

  it('rejects duplicate UI mappings and missing canonical mappings', () => {
    const original = includedSurface();
    const duplicate: UiParitySurface = {
      ...original,
      intents: [...original.intents, {
        id: 'todos.read.again', label: 'Read again', operationIds: ['todos.read' as never],
      }],
    };
    expect(() => buildConversationalParity({
      surfaces: [duplicate],
      coverage: [coverage()],
      externalCoverage: [external()],
      voiceConformanceOperationIds: [],
    })).toThrow('Duplicate UI parity operation: todos.read');

    expect(() => buildConversationalParity({
      surfaces: [],
      coverage: [coverage()],
      externalCoverage: [external()],
      voiceConformanceOperationIds: [],
    })).toThrow('Missing UI parity surface for operation: todos.read');
  });

  it('reports missing providers, proof, external exposure, voice conformance, and UI gaps', () => {
    const completeCoverage = coverage();
    const incompleteCoverage: ChatCapabilityCoverageRow = {
      ...completeCoverage,
      toolCoverage: completeCoverage.toolCoverage.map((tool) => ({
        ...tool,
        mobileHandler: false,
        serverHandler: false,
      })),
      channels: {
        mobile: { ...completeCoverage.channels.mobile, proofPaths: [] },
        phone: { ...completeCoverage.channels.phone, proofPaths: [] },
      },
    };
    const surface: UiParitySurface = {
      ...includedSurface(),
      gaps: [{ id: 'todos.write', label: 'Write To-dos', priority: 'p0', reason: 'No operation.' }],
    };

    const rows = buildConversationalParity({
      surfaces: [surface],
      coverage: [incompleteCoverage],
      externalCoverage: [{ ...external(), state: 'pending_provider' }],
      voiceConformanceOperationIds: [],
    });
    const errors = validateConversationalParity({ surfaces: [surface], rows }).join('\n');

    expect(rows[0]).toMatchObject({
      mobile: 'missing_provider',
      phone: 'missing_provider',
      external: 'missing_provider',
      voice: 'missing_conformance',
      proofPaths: [],
    });
    expect(errors).toContain('Unresolved UI gap todos.write');
    expect(errors).toContain('todos.read mobile is missing_provider');
    expect(errors).toContain('todos.read phone is missing_provider');
    expect(errors).toContain('todos.read external is missing_provider');
    expect(errors).toContain('todos.read voice is missing_conformance');
    expect(errors).toContain('todos.read has no proof paths');
    expect(() => assertFinalConversationalParity({ surfaces: [surface], rows }))
      .toThrow('Conversational control parity is incomplete');
  });

  it('allows only Games and Explore as program-level exclusions', () => {
    const baseGamesCoverage = coverage('games.open');
    const gamesCoverage: ChatCapabilityCoverageRow = {
      ...baseGamesCoverage,
      toolIds: [],
      toolCoverage: [],
      returnBehavior: 'honest_boundary',
      completionMode: 'excluded',
      channels: {
        mobile: {
          state: 'excluded', outcome: 'honest_boundary', proofPaths: [SOURCE_PATH], boundaryReason: 'Excluded.',
        },
        phone: {
          state: 'excluded', outcome: 'honest_boundary', proofPaths: [SOURCE_PATH], boundaryReason: 'Excluded.',
        },
      },
    };
    const rows = buildConversationalParity({
      surfaces: [excludedSurface()],
      coverage: [gamesCoverage],
      externalCoverage: [{ ...external('games.open'), state: 'excluded' }],
      voiceConformanceOperationIds: [],
    });
    expect(validateConversationalParity({ surfaces: [excludedSurface()], rows })).toEqual([]);

    const accountRows = buildConversationalParity({
      surfaces: [{ ...excludedSurface('account.delete'), id: 'account', title: 'Account' }],
      coverage: [{ ...gamesCoverage, id: 'account.delete', owner: 'account' }],
      externalCoverage: [{ ...external('account.delete'), state: 'excluded' }],
      voiceConformanceOperationIds: [],
    });
    expect(validateConversationalParity({
      surfaces: [{ ...excludedSurface('account.delete'), id: 'account', title: 'Account' }],
      rows: accountRows,
    }).join('\n')).toContain('Unsupported program exclusion: account.delete');
  });

  it('accepts an explicitly modeled supported boundary without pretending Kwilt performs the final act', () => {
    const boundaryCoverage: ChatCapabilityCoverageRow = {
      ...coverage('groceries.payment'),
      toolIds: [], toolCoverage: [], completionMode: 'supported_boundary',
      supportedBoundary: { finalActOwner: 'provider', reason: 'Payment remains retailer-owned.' },
      channels: {
        mobile: { state: 'excluded', outcome: 'honest_boundary', proofPaths: [SOURCE_PATH], boundaryReason: 'Provider-owned.' },
        phone: { state: 'excluded', outcome: 'honest_boundary', proofPaths: [SOURCE_PATH], boundaryReason: 'Provider-owned.' },
      },
    };
    const rows = buildConversationalParity({
      surfaces: [includedSurface('groceries.payment')], coverage: [boundaryCoverage],
      externalCoverage: [{ ...external('groceries.payment'), state: 'explicit_boundary' }],
      voiceConformanceOperationIds: [],
    });
    expect(validateConversationalParity({ surfaces: [includedSurface('groceries.payment')], rows })).toEqual([]);
  });
});
