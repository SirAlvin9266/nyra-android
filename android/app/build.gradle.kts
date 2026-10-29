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
    implementation("androidx.webkit:webkit:1.12.1")
}

val prepareNyraVendor by tasks.registering(Exec::class) {
    inputs.property("threeVersion", "0.186.1")
    inputs.property("jszipVersion", "3.10.1")
    val vendorStamp = layout.projectDirectory.file("src/main/assets/www/vendor/.vendor-ready")
    outputs.file(vendorStamp)

    commandLine(
        "bash", "-lc",
        """
        set -euo pipefail
        WWW="${'$'}PWD/app/src/main/assets/www"
        TMP="${'$'}{TMPDIR:-/tmp}/nyra-deps-${'$'}${'$'}"
        mkdir -p "${'$'}TMP/three" "${'$'}TMP/jszip" "${'$'}WWW/vendor/three/build" "${'$'}WWW/vendor/three/examples/jsm/controls" "${'$'}WWW/vendor/jszip"
        cleanup() { rm -rf "${'$'}TMP"; }
        trap cleanup EXIT

        cd "${'$'}TMP/three"
        npm pack three@0.186.1 --silent
        tar -xzf three-0.186.1.tgz
        printf '%s  %s\n' \
          '9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea' package/build/three.module.js \
          '9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6' package/build/three.core.js \
          '3d79d07ecb686b4e5d93232eedab255331c1beef711e13164eaa1f68655a5f2b' package/examples/jsm/controls/OrbitControls.js \
          '151befe25bb0d68626f9a6b033625b7b0cf6848e39ba71623b7bed8e3df565d6' package/examples/jsm/controls/TransformControls.js \
          | sha256sum -c -
        cp package/build/three.module.js "${'$'}WWW/vendor/three/build/"
        cp package/build/three.core.js "${'$'}WWW/vendor/three/build/"
        cp package/examples/jsm/controls/OrbitControls.js "${'$'}WWW/vendor/three/examples/jsm/controls/"
        cp package/examples/jsm/controls/TransformControls.js "${'$'}WWW/vendor/three/examples/jsm/controls/"
        cp package/LICENSE "${'$'}WWW/vendor/three/LICENSE"

        cd "${'$'}TMP/jszip"
        npm pack jszip@3.10.1 --silent
        tar -xzf jszip-3.10.1.tgz
        cp package/dist/jszip.min.js "${'$'}WWW/vendor/jszip/"
        cp package/LICENSE.markdown "${'$'}WWW/vendor/jszip/LICENSE.markdown"

        printf 'three=0.186.1\njszip=3.10.1\n' > "${'$'}WWW/vendor/.vendor-ready"
        test -s "${'$'}WWW/vendor/three/build/three.module.js"
        test -s "${'$'}WWW/vendor/three/build/three.core.js"
        test -s "${'$'}WWW/vendor/three/examples/jsm/controls/OrbitControls.js"
        test -s "${'$'}WWW/vendor/three/examples/jsm/controls/TransformControls.js"
        test -s "${'$'}WWW/vendor/jszip/jszip.min.js"
        """.trimIndent()
    )
}

tasks.named("preBuild").configure {
    dependsOn(prepareNyraVendor)
}
