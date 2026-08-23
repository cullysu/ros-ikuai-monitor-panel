@echo off
setlocal
if "%NUMBER_OF_PROCESSORS%"=="" (
  echo NUMBER_OF_PROCESSORS is unavailable; refusing browser launch.
  exit /b 3
)
if %NUMBER_OF_PROCESSORS% LSS 8 (
  echo At least 8 logical processors are required for the one-core CPU safety envelope.
  exit /b 3
)
set CODEX_MEMORY_LIMIT_MB=2048
set NODE_OPTIONS=--max-old-space-size=2048
set GOMAXPROCS=1
set UV_THREADPOOL_SIZE=2
set MOBILE_MAX_CPU_PERCENT=55
set MOBILE_CPU_AFFINITY_ENFORCED=1
start "" /affinity 1 /belownormal /wait /b node tools\check-mobile-reference-runtime.js %*
set RESULT=%ERRORLEVEL%
endlocal & exit /b %RESULT%
