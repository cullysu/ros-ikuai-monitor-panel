@echo off
setlocal EnableDelayedExpansion
set FIRST=1
for %%S in (single fleet all-offline no-snapshot collection-down resource-full interfaces-down) do (
  for %%V in (phone320 phone360 phone375 phone390 phone430 tablet768 landscape667 landscape844) do (
    call :runcell %%S %%V
    if errorlevel 1 (
      echo GAVEUP at %%S %%V
      exit /b 1
    )
  )
)
set MOBILE_SCENARIO=
set MOBILE_VIEWPORT=
echo === interactions pass with retry ===
for /l %%R in (1,1,40) do (
  if not defined INTERDONE (
    start "" /affinity 1 /belownormal /wait /b node tools\check-mobile-reference-runtime.js --append && set INTERDONE=1
    if not defined INTERDONE (
      echo interactions retry %%R
      ping -n 46 127.0.0.1 >nul
    )
  )
)
if not defined INTERDONE ( echo GAVEUP interactions & exit /b 1 )
echo === all done ===
exit /b 0
:runcell
set MOBILE_SCENARIO=%1
set MOBILE_VIEWPORT=%2
if %FIRST% equ 1 (set MOBILE_BATCH_MODE=first) else (set MOBILE_BATCH_MODE=append)
for /l %%R in (1,1,40) do (
  echo === cell %1 %2 attempt %%R ===
  call tools\run-mobile-reference-cell-low-load.cmd
  if not errorlevel 1 (
    set FIRST=0
    goto :cell_ok
  )
  echo cpu-wait before retry %1 %2 attempt %%R
  ping -n 46 127.0.0.1 >nul
)
exit /b 1
:cell_ok
exit /b 0
