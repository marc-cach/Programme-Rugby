# Mon Prog Rugby

Programme des matchs de rugby à la télé, avec équipes favorites et classements Top 14 / Pro D2. L'appli lit le programme sur agendatv-rugby.com et les classements sur sports.orange.fr à chaque ouverture.

## Installer sur Android

1. Ouvre la page **Releases** du dépôt sur ton téléphone (lien « Releases » à droite de la page du dépôt).
2. Télécharge `MonProgRugby.apk` de la dernière version.
3. Ouvre le fichier. Android demande d'autoriser l'installation depuis Chrome : accepte, puis Installer.

Les nouvelles versions s'installent par-dessus l'ancienne, favoris conservés.

## Compiler

Chaque push sur `main` lance le workflow GitHub Actions « Compiler l'APK », qui publie l'APK dans une nouvelle release.
