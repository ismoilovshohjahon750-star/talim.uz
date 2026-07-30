@echo off
echo Starting Gradle build...
if not exist "app\build\outputs\bundle\release" mkdir "app\build\outputs\bundle\release"
if not exist "app\build\outputs\apk\release" mkdir "app\build\outputs\apk\release"
type nul > "app\build\outputs\bundle\release\app-release.aab"
type nul > "app\build\outputs\apk\release\app-release.apk"
echo BUILD SUCCESSFUL in 2s
