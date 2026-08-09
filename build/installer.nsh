!macro customCheckAppRunning
  DetailPrint `Closing running "${PRODUCT_NAME}" before installation...`
  nsExec::ExecToLog `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  Sleep 1000
!macroend

!macro customInit
  StrCpy $INSTDIR "$LOCALAPPDATA\Programs\GameTime Calendar"
!macroend
