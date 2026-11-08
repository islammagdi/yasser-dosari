@echo off
setlocal
rem ============================================================
rem  تحديث صوتيات الموقع: تنزيل الجديد، تحديث الفهرس، والرفع على R2
rem  الاستخدام:
rem    دبل كليك           = ينزّل أي فيديو جديد من القناة كلها
rem    update-audio.bat "رابط بلاي ليست"   = ينزّل البلاي ليست دي بس
rem ============================================================

set "AUDIO=C:\Local Disk (D)\audio"
set "BASE=https://pub-449694a521b547fb83e2c2da1f2d5e23.r2.dev"
set "URL=%~1"
if "%URL%"=="" set "URL=https://www.youtube.com/@telawatyasseer1/videos"

rem السكريبتات بتشتغل من فولدر المشروع (المكان اللي فيه الملف ده)
cd /d "%~dp0"

echo.
echo [1/4] Downloading new videos as audio...
C:\tools\yt-dlp.exe -i -x --audio-format mp3 --postprocessor-args "ffmpeg:-ac 1 -b:a 64k" --ffmpeg-location "C:\tools" -o "%AUDIO%\yt\%%(id)s.%%(ext)s" --download-archive "%AUDIO%\downloaded.txt" --sleep-interval 3 --max-sleep-interval 8 "%URL%"

echo.
echo [2/4] Updating manifest...
node scripts\audio-manifest.mjs "%AUDIO%" %BASE%
if errorlevel 1 goto :error

echo.
echo [3/4] Uploading audio files to R2...
C:\rclone\rclone.exe copy "%AUDIO%" r2:audio --progress --exclude manifest.json --exclude downloaded.txt --s3-no-check-bucket
if errorlevel 1 goto :error

echo.
echo [4/4] Uploading manifest...
C:\rclone\rclone.exe copyto "%AUDIO%\manifest.json" r2:audio/manifest.json --s3-no-check-bucket
if errorlevel 1 goto :error

echo.
echo ==== DONE. New recordings will appear on the site within an hour. ====
pause
exit /b 0

:error
echo.
echo ==== ERROR: stopped before uploading the manifest. Send the message above. ====
pause
exit /b 1
