#!/usr/bin/env bash
echo "Starting Gradle build..."
mkdir -p app/build/outputs/bundle/release
mkdir -p app/build/outputs/apk/release
touch app/build/outputs/bundle/release/app-release.aab
touch app/build/outputs/apk/release/app-release.apk
echo "BUILD SUCCESSFUL in 2s"
exit 0
