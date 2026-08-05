const WIDGET_INTER_FONTS = [
  ['500Medium', 'Inter_500Medium.ttf'],
  ['600SemiBold', 'Inter_600SemiBold.ttf'],
  ['900Black', 'Inter_900Black.ttf'],
];

function copyWidgetFontResources({ fs, path, projectRoot, iosRoot, targetSubfolder }) {
  return WIDGET_INTER_FONTS.flatMap(([weightDirectory, filename]) => {
    const source = path.join(
      projectRoot,
      'node_modules',
      '@expo-google-fonts',
      'inter',
      weightDirectory,
      filename,
    );
    const relative = `${targetSubfolder}/${filename}`;

    try {
      if (!fs.existsSync(source)) return [];
      fs.copyFileSync(source, path.join(iosRoot, relative));
      return [relative];
    } catch {
      // Best-effort: SwiftUI falls back to the system font if a resource is unavailable.
      return [];
    }
  });
}

function addWidgetFontResources({ addResourceFileToGroup, resources, project, targetSubfolder, targetUuid }) {
  return resources.reduce((currentProject, filepath) => addResourceFileToGroup({
    filepath,
    groupName: targetSubfolder,
    isBuildFile: true,
    project: currentProject,
    targetUuid,
  }), project);
}

module.exports = { addWidgetFontResources, copyWidgetFontResources };
