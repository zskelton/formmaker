!macro customInit
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  StrCmp $R0 "" 0 foundPrevious

  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  StrCmp $R0 "" done foundPrevious

foundPrevious:
  DetailPrint "Previous Formmaker install found. Reinstalling..."
  ExecWait '$R0 /S'

done:
!macroend
