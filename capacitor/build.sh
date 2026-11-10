#!/usr/bin/env bash
# Baut die Android-App (APK) aus der Web-App im Repo-Hauptordner.
set -euo pipefail
cd "$(dirname "$0")"
: "${KEYSTORE_PASSWORD:?Secret KEYSTORE_PASSWORD fehlt (Repo > Settings > Secrets and variables > Actions)}"
RUN="${GITHUB_RUN_NUMBER:-1}"

rm -rf www android node_modules package.json package-lock.json capacitor.config.json capacitor.config.ts assets
mkdir www
cp ../index.html ../manifest.webmanifest ../lots-lu.geojson ../icon-192.png ../icon-512.png ../apple-touch-icon.png www/

# In der App kein Service Worker (die Dateien liegen ohnehin lokal im Paket)
python3 - <<'PY'
p='www/index.html'
s=open(p,encoding='utf8').read()
a="&&/^https?:$/.test(location.protocol))"
assert a in s,'Service-Worker-Zeile nicht gefunden'
s=s.replace(a,"&&/^https?:$/.test(location.protocol)&&location.hostname!=='localhost')",1)
open(p,'w',encoding='utf8').write(s)
PY

npm init -y >/dev/null
npm i --no-audit --no-fund @capacitor/core@7 @capacitor/cli@7 @capacitor/android@7
npx cap init Revierbuch lu.revierbuch.app --web-dir www
npx cap add android

# Berechtigungen (Standort, Kamera fuer Fotos, Display an)
python3 - <<'PY'
p='android/app/src/main/AndroidManifest.xml'
s=open(p,encoding='utf8').read()
perm='''
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
'''
assert '</manifest>' in s
s=s.replace('</manifest>',perm+'</manifest>',1)
open(p,'w',encoding='utf8').write(s)
PY

# Signatur und Versionsnummer
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:KEYSTORE_PASSWORD -in revierbuch.jks.enc -out "$PWD/android/app/revierbuch.jks"
python3 - <<PY
import re
p='android/app/build.gradle'
s=open(p,encoding='utf8').read()
sign='''signingConfigs {
        release {
            storeFile file("revierbuch.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "revierbuch"
            keyPassword System.getenv("KEYSTORE_PASSWORD")
        }
    }
    buildTypes {'''
assert 'buildTypes {' in s,'buildTypes nicht gefunden'
s=s.replace('buildTypes {',sign,1)
assert 'minifyEnabled false' in s,'minifyEnabled nicht gefunden'
s=s.replace('minifyEnabled false','minifyEnabled false\n            signingConfig signingConfigs.release',1)
s,n=re.subn(r'versionCode \d+','versionCode $RUN',s,1);assert n==1
s,n=re.subn(r'versionName "[^"]*"','versionName "1.0.$RUN"',s,1);assert n==1
open(p,'w',encoding='utf8').write(s)
PY

# App-Symbol aus dem Web-Symbol (nicht kritisch)
(
  mkdir -p assets
  convert ../icon-512.png -resize 1024x1024 assets/icon-only.png
  cp assets/icon-only.png assets/icon-foreground.png
  convert -size 1024x1024 xc:'#1f3d2f' assets/icon-background.png
  npm i --no-audit --no-fund -D @capacitor/assets
  npx capacitor-assets generate --android
) || echo "Hinweis: Symbol-Erzeugung uebersprungen"

npx cap sync android
cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon
cp app/build/outputs/apk/release/app-release.apk ../Revierbuch.apk
echo "APK fertig: $(ls -la ../Revierbuch.apk)"
