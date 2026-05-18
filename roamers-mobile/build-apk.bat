@echo off
title Roamers Community — EAS Build APK
color 0A
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║      ROAMERS COMMUNITY — APK Build               ║
echo  ║      Powered by EAS Build (Expo)                 ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  [1/2] Connexion a votre compte Expo...
echo  Entrez vos identifiants expo.dev ci-dessous.
echo.

npx eas-cli login

echo.
echo  [2/2] Lancement du build APK (environ 5-10 min)...
echo  Un lien de telechargement vous sera fourni a la fin.
echo.

npx eas-cli build --platform android --profile preview --non-interactive

echo.
echo  ============================================
echo  Build termine ! Copiez le lien APK ci-dessus
echo  et telechargez-le pour installer sur Android.
echo  ============================================
echo.
pause
