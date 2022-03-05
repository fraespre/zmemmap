set INSTALL_DIR=C:\mio\soft\dev\js\node-12.6
rem set PATH=%PATH%;%CD%\bin
set PATH=%INSTALL_DIR%;%PATH%
echo %PARTH%

start cmd /k "echo NodeJS: & node -v & echo. & echo NPM: & npm -v"