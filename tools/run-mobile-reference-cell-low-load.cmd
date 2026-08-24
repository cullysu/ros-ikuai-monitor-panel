@echo off
setlocal
if "%MOBILE_SCENARIO%"=="" (
  echo MOBILE_SCENARIO is required for a one-cell run.
  exit /b 2
)
if "%MOBILE_VIEWPORT%"=="" (
  echo MOBILE_VIEWPORT is required for a one-cell run.
  exit /b 2
)
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
if /i "%MOBILE_BATCH_MODE%"=="first" (
  node tools\run-mobile-reference-runtime.js --skip-interactions
) else (
  node tools\run-mobile-reference-runtime.js --append --skip-interactions
)
set RESULT=%ERRORLEVEL%
endlocal & exit /b %RESULT%
