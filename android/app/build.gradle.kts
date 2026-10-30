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
        versionCode = 3
        versionName = "0.3.0"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}

// Build-time vendoring is pinned and SHA-256 verified. The resulting APK is
// self-contained: no CDN requests are required while the app is being used.
val prepareNyraVendor by tasks.registering(Exec::class) {
    inputs.property("threeVersion", "0.186.1")
    inputs.property("jszipVersion", "3.10.1")
    inputs.property("vendorBundleRevision", "model-io-r1")
    val vendorStamp = layout.projectDirectory.file("src/main/assets/www/vendor/.vendor-ready")
    outputs.file(vendorStamp)

    commandLine(
        "bash", "-lc",
        """
        set -euo pipefail
        WWW="${PWD/src/main/assets/www"
        TMP="${{TMPDIR:-/tmp}/nyra-deps-${${"
        mkdir -p "${TMP/three" "${TMP/jszip" \
          "${WWW/vendor/three/build" \
          "${WWW/vendor/three/examples/jsm/controls" \
          "${WWW/vendor/three/examples/jsm/loaders" \
          "${WWW/vendor/three/examples/jsm/exporters" \
          "${WWW/vendor/three/examples/jsm/utils" \
          "${WWW/vendor/three/examples/jsm/libs" \
          "${WWW/vendor/three/examples/jsm/curves" \
          "${WWW/vendor/jszip"
        cleanup() { rm -rf "${TMP"; }
        trap cleanup EXIT

        cd "${TMP/three"
        npm pack three@0.186.1 --silent
        tar -xzf three-0.186.1.tgz

        cat > three.sha256 <<'HASHES'
9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea  package/build/three.module.js
9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6  package/build/three.core.js
3d79d07ecb686b4e5d93232eedab255331c1beef711e13164eaa1f68655a5f2b  package/examples/jsm/controls/OrbitControls.js
151befe25bb0d68626f9a6b033625b7b0cf6848e39ba71623b7bed8e3df565d6  package/examples/jsm/controls/TransformControls.js
131c0f78c01d19368ae495caa65b3adaa10487810a36a05bb5901b769a35ac16  package/examples/jsm/loaders/GLTFLoader.js
86c8384e269b75a21d502d438e3f0dc2e09dc61b6e6da6b81947f5b119112bf8  package/examples/jsm/loaders/OBJLoader.js
7fb8586158a2cf98477b2ee40a82ebec10a81040c70369bb177043375c355322  package/examples/jsm/loaders/FBXLoader.js
023ed97f848b633d8bcd53d4db3b996d29d0c644088700691297c552257d480b  package/examples/jsm/loaders/STLLoader.js
d766b04f233fa8bc72bfaebacaac5ecb832c30ca3695ce8d84bbb7dccccdc842  package/examples/jsm/exporters/GLTFExporter.js
2df529483eec685ec5c9a52f6a370acc654592aeeb495a8e862d8bb6d3d5063e  package/examples/jsm/exporters/OBJExporter.js
6508e5f79d120c7fdb677430342179609b27f59942dd6a2e215eef3ff60a7e60  package/examples/jsm/exporters/STLExporter.js
9fb63427ce6641fa14fd0baff9cc4d1b5f9c3d85fd084bf2e90e803c44ec1797  package/examples/jsm/utils/BufferGeometryUtils.js
b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f  package/examples/jsm/utils/SkeletonUtils.js
209a4412eb48ce609edb4391992a792ffcc3983d30ee7e2b0b89a8c470f3cd8a  package/examples/jsm/libs/fflate.module.js
bef2607618a7778455e71a1f0bd206951c382d313e2e245808cc7d3533d60fb6  package/examples/jsm/curves/NURBSCurve.js
c6bd7c4137d585098923f189687898ea3e8762ea3ecbe255d749a56353894379  package/examples/jsm/curves/NURBSUtils.js
HASHES
        sha256sum -c three.sha256

        cp package/build/three.module.js "${WWW/vendor/three/build/"
        cp package/build/three.core.js "${WWW/vendor/three/build/"
        cp package/LICENSE "${WWW/vendor/three/LICENSE"
        for file in OrbitControls TransformControls; do
          cp "package/examples/jsm/controls/${file.js" "${WWW/vendor/three/examples/jsm/controls/"
        done
        for file in GLTFLoader OBJLoader FBXLoader STLLoader; do
          cp "package/examples/jsm/loaders/${file.js" "${WWW/vendor/three/examples/jsm/loaders/"
        done
        for file in GLTFExporter OBJExporter STLExporter; do
          cp "package/examples/jsm/exporters/${file.js" "${WWW/vendor/three/examples/jsm/exporters/"
        done
        cp package/examples/jsm/utils/BufferGeometryUtils.js "${WWW/vendor/three/examples/jsm/utils/"
        cp package/examples/jsm/utils/SkeletonUtils.js "${WWW/vendor/three/examples/jsm/utils/"
        cp package/examples/jsm/libs/fflate.module.js "${WWW/vendor/three/examples/jsm/libs/"
        cp package/examples/jsm/curves/NURBSCurve.js "${WWW/vendor/three/examples/jsm/curves/"
        cp package/examples/jsm/curves/NURBSUtils.js "${WWW/vendor/three/examples/jsm/curves/"

        cd "${TMP/jszip"
        npm pack jszip@3.10.1 --silent
        tar -xzf jszip-3.10.1.tgz
        cp package/dist/jszip.min.js "${WWW/vendor/jszip/"
        cp package/LICENSE.markdown "${WWW/vendor/jszip/LICENSE.markdown"

        printf 'three=0.186.1\njszip=3.10.1\nvendor=model-io-r1\n' > "${WWW/vendor/.vendor-ready"
        test -s "${WWW/vendor/three/examples/jsm/loaders/GLTFLoader.js"
        test -s "${WWW/vendor/three/examples/jsm/loaders/OBJLoader.js"
        test -s "${WWW/vendor/three/examples/jsm/loaders/FBXLoader.js"
        test -s "${WWW/vendor/three/examples/jsm/loaders/STLLoader.js"
        test -s "${WWW/vendor/three/examples/jsm/exporters/GLTFExporter.js"
        test -s "${WWW/vendor/three/examples/jsm/exporters/OBJExporter.js"
        test -s "${WWW/vendor/three/examples/jsm/exporters/STLExporter.js"
        test -s "${WWW/vendor/jszip/jszip.min.js"
        """.trimIndent()
    )
}

tasks.named("preBuild").configure {
    dependsOn(prepareNyraVendor)
}
