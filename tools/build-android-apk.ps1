param(
    [string]$SdkRoot = "C:\Users\cully\Documents\codex_network_incident_20260712\android-sdk",
    [string]$JavaHome = "C:\Users\cully\Documents\codex_network_incident_20260712\android-sdk\jdk21"
)

$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $SdkRoot
$env:PATH = (Join-Path $JavaHome 'bin') + ';' + $env:PATH
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$appRoot = Join-Path $root 'android-app'
$buildRoot = Join-Path $appRoot 'build-manual'
$classes = Join-Path $buildRoot 'classes'
$gen = Join-Path $buildRoot 'generated'
$resCompiled = Join-Path $buildRoot 'res.zip'
$unsigned = Join-Path $buildRoot 'unsigned.apk'
$aligned = Join-Path $buildRoot 'aligned.apk'
$dist = Join-Path $root 'dist'
$apk = Join-Path $dist 'RouterOS-Monitor-debug.apk'
$androidJar = Join-Path $SdkRoot 'platforms\android-35\android.jar'
$aapt2 = Join-Path $SdkRoot 'build-tools\34.0.0\aapt2.exe'
$d8 = Join-Path $SdkRoot 'build-tools\34.0.0\d8.bat'
$zipalign = Join-Path $SdkRoot 'build-tools\34.0.0\zipalign.exe'
$apksigner = Join-Path $SdkRoot 'build-tools\34.0.0\apksigner.bat'
$javac = Join-Path $JavaHome 'bin\javac.exe'
$keytool = Join-Path $JavaHome 'bin\keytool.exe'
$python = 'C:\Users\cully\AppData\Local\Programs\Python\Python313\python.exe'
$packDex = Join-Path $PSScriptRoot 'pack-android-dex.py'

foreach ($path in @($androidJar, $aapt2, $d8, $zipalign, $apksigner, $javac, $keytool, $python, $packDex)) {
    if (-not (Test-Path $path)) { throw "Missing Android build tool: $path" }
}

Remove-Item $buildRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item $classes, $gen, $dist -ItemType Directory -Force | Out-Null

& $aapt2 compile --dir (Join-Path $appRoot 'app\src\main\res') -o $resCompiled
if ($LASTEXITCODE -ne 0) { throw 'aapt2 resource compile failed' }

$assets = Join-Path $appRoot 'app\src\main\assets'
& $aapt2 link -o $unsigned -I $androidJar --manifest (Join-Path $appRoot 'app\src\main\AndroidManifest.xml') --java $gen --min-sdk-version 23 --target-sdk-version 35 --version-code 1 --version-name 1.0.0 --debug-mode -A $assets $resCompiled
if ($LASTEXITCODE -ne 0) { throw 'aapt2 resource link failed' }

$javaSources = Get-ChildItem (Join-Path $appRoot 'app\src\main\java') -Recurse -Filter *.java | ForEach-Object { $_.FullName }
$rSource = Join-Path $gen 'com\cully\routerospanel\R.java'
& $javac -source 8 -target 8 -encoding UTF-8 -classpath $androidJar -d $classes $rSource @javaSources
if ($LASTEXITCODE -ne 0) { throw 'javac failed' }

$dexDir = Join-Path $buildRoot 'dex'
New-Item $dexDir -ItemType Directory -Force | Out-Null
$classFiles = Get-ChildItem $classes -Recurse -Filter *.class | ForEach-Object { $_.FullName }
& $d8 --lib $androidJar --output $dexDir @classFiles
if ($LASTEXITCODE -ne 0) { throw 'd8 failed' }

$classesDex = Join-Path $dexDir 'classes.dex'
$packed = Join-Path $buildRoot 'packed.apk'
& $python $packDex --apk $unsigned --dex $classesDex --out $packed
if ($LASTEXITCODE -ne 0) { throw 'APK dex packaging failed' }
Copy-Item $packed $unsigned -Force

& $zipalign -f 4 $unsigned $aligned
if ($LASTEXITCODE -ne 0) { throw 'zipalign failed' }

# Keep the debug keystore outside build-manual so rebuilds keep the same
# signature and installed builds accept `adb install -r` updates.
$keystore = Join-Path $appRoot 'debug.keystore'
if (-not (Test-Path $keystore)) {
    & $keytool -genkeypair -v -keystore $keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Android Debug,O=Android,C=US'
    if ($LASTEXITCODE -ne 0) { throw 'debug keystore creation failed' }
}

Remove-Item $apk -Force -ErrorAction SilentlyContinue
& $apksigner sign --ks $keystore --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey --out $apk $aligned
if ($LASTEXITCODE -ne 0) { throw 'APK signing failed' }
& $apksigner verify --verbose $apk
if ($LASTEXITCODE -ne 0) { throw 'APK verification failed' }

Write-Host "APK: $apk"
Write-Host "Size: $((Get-Item $apk).Length) bytes"
