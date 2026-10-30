#!/bin/sh
#
# Gradle startup script for POSIX generated for this project.
# Runs the checked-in Gradle wrapper distribution configured in gradle/wrapper/gradle-wrapper.properties.
#
APP_HOME=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P) || exit
if [ -n "$JAVA_HOME" ]; then
  JAVACMD="$JAVA_HOME/bin/java"
else
  JAVACMD="java"
fi
if ! command -v "$JAVACMD" >/dev/null 2>&1; then
  echo "ERROR: Java was not found. Install JDK 17 or set JAVA_HOME." >&2
  exit 1
fi
WRAPPER_DIR="$APP_HOME/gradle/wrapper"
PROPS="$WRAPPER_DIR/gradle-wrapper.properties"
DIST_URL=$(sed -n 's/^distributionUrl=//p' "$PROPS" | sed 's/\\:/\:/g')
DIST_URL=$(printf '%s' "$DIST_URL" | sed 's/\\\\/\\/g')
if [ -z "$DIST_URL" ]; then
  echo "ERROR: distributionUrl is missing from $PROPS" >&2
  exit 1
fi
DIST_NAME=$(basename "$DIST_URL")
DIST_BASE=$(printf '%s' "$DIST_NAME" | sed 's/-bin\.zip$//')
GRADLE_USER_HOME="${GRADLE_USER_HOME:-$HOME/.gradle}"
INSTALL_DIR="$GRADLE_USER_HOME/wrapper/dists/$DIST_BASE/manual"
GRADLE_BIN="$INSTALL_DIR/$DIST_BASE/bin/gradle"
if [ ! -x "$GRADLE_BIN" ]; then
  mkdir -p "$INSTALL_DIR" || exit 1
  ZIP="$INSTALL_DIR/$DIST_NAME"
  if [ ! -f "$ZIP" ]; then
    echo "Downloading $DIST_URL"
    if command -v curl >/dev/null 2>&1; then
      curl -fL --retry 3 "$DIST_URL" -o "$ZIP" || exit 1
    elif command -v wget >/dev/null 2>&1; then
      wget -O "$ZIP" "$DIST_URL" || exit 1
    else
      echo "ERROR: curl or wget is required to download Gradle." >&2
      exit 1
    fi
  fi
  unzip -q -o "$ZIP" -d "$INSTALL_DIR" || exit 1
fi
exec "$GRADLE_BIN" "$@"
