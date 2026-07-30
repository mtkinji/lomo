export function buildRelatedTestCommand(files) {
  return `npm test -- --runInBand --passWithNoTests --findRelatedTests ${files
    .map((file) => JSON.stringify(file))
    .join(' ')}`;
}
