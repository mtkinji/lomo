import { buildRelatedTestCommand, needsEasUploadPolicy } from '../verify-changed-lib.mjs';

// Protected integration policy. Local optimizations belong in local-plan.mjs.
export function buildVerificationPlan(files, base) {
  const commands = [];
  const manual = [];
  const notes = [];

  function add(command, reason) {
    if (!commands.some((entry) => entry.command === command)) {
      commands.push({ command, reason });
    }
  }

  function addManual(command, reason) {
    if (!manual.some((entry) => entry.command === command)) {
      manual.push({ command, reason });
    }
  }

  function matches(pattern) {
    return files.some((file) => pattern.test(file));
  }

  if (files.length > 0) {
    add('git diff --check', 'catch whitespace and conflict-marker issues before deeper gates');
  }

  const appCodeFiles = files.filter((file) =>
    /^(src|packages)\/.*\.(ts|tsx|js|jsx|json)$/.test(file) ||
    /^(app\.config\.ts|babel\.config\.js|metro\.config\.js|jest\.config\.js|package(-lock)?\.json|tsconfig.*\.json)$/.test(file),
  );

  if (appCodeFiles.length > 0) {
    add('npm run lint', 'typecheck app, workspace packages, and shared TypeScript contracts');
  }

  if (
    matches(/^(src|packages|supabase\/functions|scripts|plugins)\//) ||
    matches(/^(package(-lock)?\.json|\.github\/workflows\/)/)
  ) {
    add(
      `npm run code:health -- --fail-on-regression --base ${JSON.stringify(base)}`,
      'enforce code-health ratchets against newly introduced complexity',
    );
  }

  if (matches(/^scripts\/code-health(-lib)?(\.test)?\.mjs$/)) {
    add('npm run test:code-health', 'unit-test the code-health ratchet rules');
  }

  if (needsEasUploadPolicy(files)) {
    add(
      'npm run test:eas-upload-policy',
      'validate EAS archive exclusions and prevent credential or generated-artifact upload drift',
    );
  }

  if (matches(/^(assets\/audio\/|modules\/kwilt-seamless-loop\/|src\/services\/(soundscape|soundscapeCatalog|soundscapeLoop|audioAsset)|scripts\/audio\/)/)) {
    add('npm run audio:audit:soundscape-contract', 'require every visible Focus soundscape to have admitted immutable loop bytes');
    add(
      'node --test scripts/audio/soundscape-loop-contract.test.mjs scripts/audio/loop-seam-lib.test.mjs scripts/audio/master-loop.test.mjs scripts/audio/rendered-loop-probe.test.mjs scripts/audio/ios-pcm-cache.test.mjs',
      'test source-seam, mastering, admission, and rendered-continuity policies',
    );
  }

  if (matches(/^modules\/kwilt-seamless-loop\/ios\//)) {
    addManual(
      "npx expo prebuild --platform ios --no-install && npx pod-install && xcodebuild -workspace ios/Kwilt.xcworkspace -scheme Kwilt -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build",
      'generate the managed iOS project and compile/link the local seamless-loop pod',
    );
  }

  if (matches(/^modules\/kwilt-seamless-loop\/android\//)) {
    addManual(
      'npx expo prebuild --platform android --no-install && (cd android && ./gradlew :kwilt-seamless-loop:compileDebugKotlin)',
      'generate the managed Android project and compile the local seamless-loop module with a configured JDK',
    );
  }

  if (matches(/(^|\/)([^/]+\.)?(test|spec)\.(ts|tsx)$/) || matches(/^(jest\.setup\.ts|jest\.config\.js|src\/test\/|tsconfig\.test\.json)/)) {
    add('npm run lint:tests', 'typecheck Jest files and shared test harness code that app lint excludes');
  }

  const relatedTestCandidates = appCodeFiles.filter((file) => /\.(ts|tsx)$/.test(file) && !/\.(test|spec)\.(ts|tsx)$/.test(file));
  if (relatedTestCandidates.length > 0 && relatedTestCandidates.length <= 20) {
    add(
      buildRelatedTestCommand(relatedTestCandidates),
      'run the Jest tests most directly related to touched app/package files',
    );
  } else if (relatedTestCandidates.length > 20 || matches(/^(jest\.config\.js|jest\.setup\.ts|src\/test\/)/)) {
    add('npm test -- --runInBand', 'run the full Jest suite because shared test/runtime configuration changed');
  }

  if (matches(/^supabase\/functions\/.*\.ts$/)) {
    add('npm run lint:supabase-functions', 'typecheck Supabase Edge Functions with the Deno gate');
    add('npm run test:supabase-functions', 'run Deno unit tests for extracted Supabase function helpers');
  }

  if (matches(/^(docs\/jtbd\/|docs\/personas\/|docs\/job-flows\/|docs\/feature-briefs\/|docs\/delivery-evidence\/|src\/features\/[^/]+\/FEATURE\.md)/)) {
    add('npm run product:lint', 'validate JTBD, persona, job-flow, feature, and feature-brief references');
  }

  if (matches(/^(src\/features\/unifiedChat\/|docs\/delivery-evidence\/unified-chat|docs\/feature-briefs\/unified-chat|scripts\/chat-delivery-lint)/)) {
    add('npm run chat:delivery-lint', 'validate Unified Chat delivery scores against code, tests, and runtime evidence');
  }

  if (matches(/^(src\/features\/unifiedChat\/|protocol-fixtures\/|supabase\/migrations\/.*unified_chat|scripts\/(chat-delivery-lint|unified-chat-migration-contract|unified-chat-protocol-conformance))/)) {
    add('npm run test:chat-contracts', 'run Unified Chat delivery and durable-schema contract tests');
  }

  if (matches(/^(docs\/(analytics-money-transaction-truth\.md|delivery-evidence\/money-transaction-truth\.json)|src\/capabilities\/money\/(domain\/transactionTruthTelemetry|runtime\/transactionTruthAnalytics)|scripts\/money-transaction-truth-evidence)/)) {
    add('npm run test:money-transaction-truth:evidence', 'unit-test the privacy-safe score-five thresholds and denominators');
    add('npm run money:transaction-truth:evidence', 'reject impossible evidence or an unsupported Money score-five claim');
  }

  if (matches(/^(docs\/|src\/features\/[^/]+\/FEATURE\.md|scripts\/generate-agent-code-map\.mjs)/)) {
    add('npm run agent:map', 'refresh the agent-facing code map after docs or feature manifest changes');
  }

  // Input discovery covers src/packages; policy-only and token changes must also run the guard in PRs.
  if (matches(/^(src\/|packages\/|package(-lock)?\.json$|docs\/ui-architecture\.md|scripts\/input-patterns\/|scripts\/architecture-lint\.mjs|scripts\/generate-agent-code-map\.mjs)/)) {
    add('npm run architecture:lint', 'check enforceable UI/feature architecture conventions');
  }

  if (matches(/^(supabase\/functions\/mcp\/|scripts\/mcp-|packages\/kwilt-sdk\/)/)) {
    addManual('npm run mcp:smoke', 'requires MCP environment credentials; run when connector behavior changed');
  }

  if (matches(/^(e2e\/maestro\/|src\/features\/(activities|arcs|goals|onboarding|ai)\/)/)) {
    addManual('maestro test e2e/maestro/<relevant-flow>.yaml', 'native interaction flows need a simulator or device');
  }

  if (matches(/^(e2e\/visual-|scripts\/visual-regression\/|src\/ui\/|src\/features\/)/)) {
    addManual('npm run visual:compare', 'requires fresh Maestro screenshots; use when visual surfaces changed');
  }

  if (files.length === 0) {
    notes.push('No changed files detected against the working tree, index, or branch base.');
  }

  if (matches(/^scripts\/(verification\/|verify-(changed|local)(-lib)?(\.test)?\.mjs$)/)) {
    add('npm run test:verification', 'test verification tooling without relaxing any existing integration gate');
  }

  const plan = {
    base,
    changedFiles: files,
    commands,
    manual,
    notes,
  };

  return plan;
}
