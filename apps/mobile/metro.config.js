const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
// The portable design tokens live alongside both application surfaces.
config.watchFolders = [path.resolve(__dirname, '../..')];
const previous = config.resolver.blockList;
const workspace = path.resolve(__dirname, '../..');
const excludedFolders = [
  path.join(workspace, 'backend'),
  path.join(workspace, '.next'),
  path.join(workspace, '.runtime'),
  path.join(workspace, '.gradle'),
  path.join(workspace, 'dist'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'android', 'build'),
  path.join(__dirname, 'android', 'app', 'build'),
];
function excludeFolder(folder) {
  const escaped = folder.split(path.sep).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[/\\\\]');
  return new RegExp('^' + escaped + '([/\\\\]|$)');
}
config.resolver.blockList = [
  ...(Array.isArray(previous) ? previous : previous ? [previous] : []),
  ...excludedFolders.map(excludeFolder),
];
config.maxWorkers=2;
module.exports = config;
