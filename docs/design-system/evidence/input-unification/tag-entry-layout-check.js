(async () => {
  await document.fonts.ready;
  const field = document.querySelector('[data-testid="tag-entry-specimen"]');
  if (!field) throw new Error('Tag entry specimen did not render');
  const bounds = field.getBoundingClientRect();
  const chips = [...field.querySelectorAll('[role="button"]')];
  if (chips.length < 2) throw new Error('Expected populated tag chips');
  const failures = [];
  for (const chip of chips) {
    const rect = chip.getBoundingClientRect();
    if (rect.left < bounds.left || rect.right > bounds.right) {
      failures.push(`Tag chip overflows its field: ${chip.getAttribute('aria-label')}`);
    }
    const icon = chip.querySelector('svg')?.getBoundingClientRect();
    if (!icon || icon.width < 14 || icon.height < 14) {
      failures.push(`Tag close icon shrank: ${chip.getAttribute('aria-label')}`);
    }
    if (rect.width < 44 || rect.height < 44) {
      failures.push(`Tag removal target is below44 points: ${chip.getAttribute('aria-label')}`);
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  return {width: innerWidth, chips: chips.length, containment: true, minimumTargets: true};
})()
