export function buildRelatedTestCommand(files) {
  return `npm test -- --runInBand --passWithNoTests --findRelatedTests ${files
    .map((file) => JSON.stringify(file))
    .join(' ')}`;
}

export function needsEasUploadPolicy(files) {
  return files.some((file) =>
    /^(\.easignore|eas\.json|scripts\/eas-upload-policy(?:-lib)?(?:\.test)?\.mjs)$/.test(file),
  );
}
