import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

export async function compileTypeScriptExport({ sourceFiles, rootDir, exportFile, exportName }) {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'kwilt-recipe-enrichment-'));
  try {
    const program = ts.createProgram(sourceFiles, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir: outputDir,
      skipLibCheck: true,
      esModuleInterop: true,
      noEmitOnError: true,
    });
    const result = program.emit();
    if (result.emitSkipped) {
      throw new Error(ts.formatDiagnosticsWithColorAndContext(ts.getPreEmitDiagnostics(program), {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => rootDir,
        getNewLine: () => '\n',
      }));
    }
    const compiledPath = path.join(outputDir, path.relative(rootDir, exportFile)).replace(/\.ts$/, '.js');
    return createRequire(import.meta.url)(compiledPath)[exportName];
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

export async function loadCanonicalCatalog(kwiltRoot = process.cwd()) {
  const rootDir = path.resolve(kwiltRoot, 'src/capabilities/recipes/data');
  const exportFile = path.join(rootDir, 'starterEditorialRecipeCatalog.ts');
  return compileTypeScriptExport({
    sourceFiles: [exportFile],
    rootDir,
    exportFile,
    exportName: 'STARTER_EDITORIAL_RECIPE_CATALOG',
  });
}

export function canonicalRecipeEvidence(recipe) {
  return {
    rosterId: recipe.rosterId,
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    cuisine: recipe.cuisine,
    yieldQuantity: recipe.yieldQuantity,
    yieldUnit: recipe.yieldUnit,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    notes: recipe.notes,
  };
}

export function canonicalRecipeHash(recipe) {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalRecipeEvidence(recipe))).digest('hex')}`;
}
