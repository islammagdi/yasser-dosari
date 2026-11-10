@echo off
setlocal
rem ============================================================
rem  تحديث صوتيات الموقع:
rem   1) حط روابط الفيديوهات أو البلاي ليستات الجديدة في links.txt (رابط في كل سطر)
rem   2) دبل كليك على الملف ده
rem   3) افتح /admin/recordings وصنّف الجديد
rem ============================================================

set "AUDIO=C:\Local Disk (D)\audio"
set "BASE=https://pub-449694a521b547fb83e2c2da1f2d5e23.r2.dev"
set "LINKS=%~dp0links.txt"

cd /d "%~dp0"
if not exist "%LINKS%" type nul > "%LINKS%"

for %%A in ("%LINKS%") do set "SIZE=%%~zA"
if "%SIZE%"=="0" (
  echo links.txt is empty - skipping download.
  goto :manifest
)

echo.
echo [1/4] Downloading links.txt as audio...
C:\tools\yt-dlp.exe -i -x --audio-format mp3 --postprocessor-args "ffmpeg:-ac 1 -b:a 64k" --ffmpeg-location "C:\tools" -o "%AUDIO%\yt\%%(id)s.%%(ext)s" --download-archive "%AUDIO%\downloaded.txt" --print-to-file "after_move:%%(id)s %%(upload_date)s %%(title)s" "%AUDIO%\meta.txt" --sleep-interval 3 --max-sleep-interval 8 -a "%LINKS%"

:manifest
echo.
echo [2/4] Updating manifest...
node scripts\audio-manifest.mjs "%AUDIO%" %BASE%
if errorlevel 1 goto :error

echo.
echo [3/4] Uploading audio files to R2...
C:\rclone\rclone.exe copy "%AUDIO%" r2:audio --progress --include "*.mp3" --include "*.m4a" --include "*.jpg" --include "*.jpeg" --include "*.png" --include "*.webp" --s3-no-check-bucket
if errorlevel 1 goto :error

echo.
echo [4/4] Uploading manifest...
C:\rclone\rclone.exe copyto "%AUDIO%\manifest.json" r2:audio/manifest.json --s3-no-check-bucket
if errorlevel 1 goto :error

rem الروابط اللي خلصت بتتنقل لـ links-done.txt، و links.txt يفضى للمرة الجاية
if not "%SIZE%"=="0" (
  type "%LINKS%" >> "%~dp0links-done.txt"
  type nul > "%LINKS%"
)

echo.
echo ==== DONE. Open /admin/recordings to classify the new recordings. ====
pause
exit /b 0

:error
echo.
echo ==== ERROR: stopped before uploading the manifest. Send the message above. ====
pause
exit /b 1
