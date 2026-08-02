; Personalización del instalador NSIS.
;
; electron-builder lo carga solo por estar aquí: busca `installer.nsh` dentro
; de la carpeta de recursos de compilación (`buildResources`, que en este
; proyecto es `recursos/`). No hay que declararlo en package.json.

; Limpieza de la versión anterior.
;
; Al actualizar sobre la misma carpeta, electron-builder ya desinstala la
; versión previa. Lo que no cubre es que esté en OTRA carpeta, cosa posible
; porque el instalador deja elegir la ruta: sin esto quedarían dos copias
; registradas en «Aplicaciones instaladas» y dos juegos de accesos directos,
; y la antigua seguiría ocupando disco.
;
; Se ejecuta el desinstalador registrado en modo silencioso y después se
; borran los restos. Para no borrar nada ajeno por accidente, solo se actúa si
; la carpeta contiene de verdad nuestro ejecutable.
!macro customInit
  ReadRegStr $R0 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ReadRegStr $R1 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"

  ${if} $R0 != ""
  ${andif} $R1 != ""
  ${andif} $R1 != "$INSTDIR"
    ${if} ${FileExists} "$R1\${APP_EXECUTABLE_FILENAME}"
      DetailPrint "Quitando la versión anterior instalada en $R1"

      ; _?= mantiene el proceso en primer plano, para que el ExecWait espere
      ; de verdad a que termine antes de continuar con la instalación.
      ExecWait '"$R0" /S _?=$R1'

      ; el desinstalador no puede borrarse a sí mismo con _?=
      RMDir /r "$R1"
    ${endif}
  ${endif}
!macroend
