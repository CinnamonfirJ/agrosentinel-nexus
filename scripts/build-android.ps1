$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$android = Join-Path $workspace 'apps/mobile/android'
if (-not (Test-Path -LiteralPath (Join-Path $android 'gradlew.bat'))) {
  Push-Location (Join-Path $workspace 'apps/mobile')
  try { & node node_modules/expo/bin/cli prebuild --platform android --no-install; if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' } } finally { Pop-Location }
}
Push-Location $android
try {
  & .\gradlew.bat app:assembleRelease --init-script (Join-Path $PSScriptRoot 'android-paths.gradle') --no-daemon --max-workers=2 '-PreactNativeArchitectures=arm64-v8a' '-Pandroid.enableMinifyInReleaseBuilds=false' '-Pandroid.enableShrinkResourcesInReleaseBuilds=false' '-Dorg.gradle.jvmargs=-Xmx2048m'
  $buildExit = $LASTEXITCODE
} finally { Pop-Location }
exit $buildExit
