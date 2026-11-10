# Revierbuch als Android-App (APK)

Die APK wird automatisch von GitHub gebaut (Reiter "Actions" > "Android-App bauen" > "Run workflow").
Fertige APKs stehen unter "Releases". Voraussetzung: Secret `KEYSTORE_PASSWORD` im Repo.

Das Signierzertifikat liegt verschluesselt als `revierbuch.jks.enc` im Repo. Das Passwort dazu
unbedingt separat sichern (Passwortmanager): Ohne Passwort lassen sich keine Updates mehr ueber
bestehende Installationen legen.

Die App enthaelt eine Kopie der Web-App (index.html). Nach Aenderungen an der Web-App einfach den
Workflow erneut starten, dann gibt es eine neue APK.
