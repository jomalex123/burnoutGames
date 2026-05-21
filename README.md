# Burnout Games

Aplicacion web estatica/PWA con minijuegos para partidas de Burnout Airsoft.

## Juegos incluidos

- **Bomba C4**: configura un tiempo en formato `MMSS`, define un codigo de desactivacion, espera el armado y manten pulsado `#` para activar la cuenta atras.
- **Dominio de banderas**: cronometro de control por equipos con botones rojo y azul.
- **Interruptores**: pendiente de desarrollo.

## Estructura

```text
.
|-- burnoutgames.html              # Menu principal
|-- burnoutgames_c4.html           # Juego Bomba C4
|-- burnoutgames_dominio.html      # Juego Dominio de banderas
|-- burnoutgames.webmanifest       # Manifest de la PWA
|-- burnoutgames-sw.js             # Service worker para uso offline
|-- assets/
|   |-- css/                       # Estilos de la aplicacion
|   `-- js/                        # Logica de los juegos y registro PWA
`-- images/resources/              # Icono y recursos graficos
```

## Ejecucion local

No requiere compilacion ni dependencias de Node. Para ejecutarla en XAMPP:

1. Copia o clona el proyecto en `htdocs/burnoutGames`.
2. Activa Apache desde el panel de XAMPP.
3. Abre `http://localhost/burnoutGames/`.

La directiva `DirectoryIndex` del `.htaccess` carga `burnoutgames.html` como pantalla inicial.

## Generar APK Android

El proyecto Android esta en la carpeta `android/`. Actualmente no incluye Gradle Wrapper, asi que necesitas tener instalados:

- Android SDK con `compileSdk 35`.
- JDK compatible con Android Gradle Plugin 8.7.3; en esta maquina se ha validado con Java 21.
- Gradle disponible en el `PATH`.

Para compilar el APK de debug desde PowerShell:

```powershell
cd android
gradle :app:assembleDebug
```

El APK se genera en:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Si se anade Gradle Wrapper al proyecto mas adelante, el comando equivalente desde Windows seria:

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

## PWA y modo offline

La aplicacion registra `burnoutgames-sw.js` desde `assets/js/burnoutgames_pwa.js`.
El service worker cachea las paginas, estilos, scripts, manifest e icono principal para que los juegos funcionen sin conexion despues de la primera carga correcta.

Si modificas archivos ya cacheados, cambia el valor de `BURNOUT_GAMES_CACHE` en `burnoutgames-sw.js` para forzar una nueva version offline.

## Despliegue en Apache

El archivo `.htaccess` esta preparado para:

- usar `burnoutgames.html` como entrada por defecto;
- servir correctamente archivos `.webmanifest`, `.js` y `.css`;
- bloquear el listado de directorios;
- evitar cache agresiva en HTML, manifest y service worker.

Para publicar en otra ruta, manten todos los archivos juntos en la misma carpeta, ya que las rutas del manifest, CSS, JS e imagenes son relativas.
