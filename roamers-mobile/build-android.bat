@echo off
echo Building Roamers Android APK...

set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\lenovo\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

cd /d "%~dp0android"

call gradlew.bat assembleRelease -Pandroid.injected.build.abi=arm64-v8a
if %ERRORLEVEL% NEQ 0 (
    echo BUILD FAILED
    pause
    exit /b 1
)

echo.
echo Build successful! Installing on connected device...
adb install -t -r "..\android\app\build\intermediates\apk\release\app-release.apk"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS - Roamers installed on device!
) else (
    echo.
    echo Install failed. Make sure USB debugging is enabled and device is connected.
)
pause
