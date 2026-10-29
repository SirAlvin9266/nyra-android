plugins {
    id("com.android.application")
}

android {
    namespace = "com.nyra.studio"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.nyra.studio"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.0"
    }
}

dependencies {
    // WebViewAssetLoader provides an HTTPS-like local origin, required for ES modules
    // and import maps to load reliably from bundled Android assets.
    implementation("androidx.webkit:webkit:1.12.1")
}

// The two source-of-truth files remain the provided integrated HTML and Three.js ZIP.
// Dependencies are pinned to the versions used/contained in those references, then copied
// into assets so runtime execution does not use a CDN.
val prepareNyraVendor by tasks.registering(Exec::class) {
    val www = layout.projectDirectory.dir("src/main/assets/www").asFile
    val vendor = www.resolve("vendor")
    val stamp = vendor.resolve(".vendor-ready")
    inputs.property("threeVersion", "0.186.1")
    inputs.property("jszipVersion", "3.10.1")
    outputs.file(stamp)

    doFirst {
        vendor.mkdirs()
    }
    commandLine(
        "bash", "-lc",
        """
        set -euo pipefail
        WWW='${PWD}/app/src/main/assets/www'
        TMP='${TMPDIR:-/tmp}/nyra-deps-$$'
        mkdir -p "$TMP/three" "$TMP/jszip" "$WWW/vendor/three/build" "$WWW/vendor/three/examples/jsm/controls" "$WWW/vendor/jszip"
        cleanup() { rm -rf "$TMP"; }
        trap cleanup EXIT

        cd "$TMP/three"
        npm pack three@0.186.1 --silent
        tar -xzf three-0.186.1.tgz
        test -f package/build/three.module.js
        test -f package/build/three.core.js
        test -f package/examples/jsm/controls/OrbitControls.js
        test -f package/examples/jsm/controls/TransformControls.js
        cp package/build/three.module.js "$WWW/vendor/three/build/"
        cp package/build/three.core.js "$WWW/vendor/three/build/"
        cp package/examples/jsm/controls/OrbitControls.js "$WWW/vendor/three/examples/jsm/controls/"
        cp package/examples/jsm/controls/TransformControls.js "$WWW/vendor/three/examples/jsm/controls/"
        cp package/LICENSE "$WWW/vendor/three/LICENSE"

        cd "$TMP/jszip"
        npm pack jszip@3.10.1 --silent
        tar -xzf jszip-3.10.1.tgz
        cp package/dist/jszip.min.js "$WWW/vendor/jszip/"
        cp package/LICENSE.markdown "$WWW/vendor/jszip/LICENSE.markdown"

        printf 'three=0.186.1\njszip=3.10.1\n' > "$WWW/vendor/.vendor-ready"
        """.trimIndent()
    )
}

tasks.named("preBuild").configure {
    dependsOn(prepareNyraVendor)
}
