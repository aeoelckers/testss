# Testss Repo

This repository is a lightweight sandbox for trying out changes and testing workflows. Use it to make quick edits, run scripts, or practice commit and PR flows without worrying about complex dependencies. The repo now also includes a simple CRM web page to guardar el historial de patentes consultadas en patentechile.com.

## Contents
- `index.html`: Single-page CRM para registrar patentes, segmentos y notas.
- `styles.css`: Minimal styling para el CRM.
- `script.js`: Front-end logic con filtros, guardado local y acciones rápidas.
- `example.py`: Simple Python script that prints a confirmation message.
- `server.py`: Servidor mínimo que sirve el CRM y actúa como proxy hacia patentechile.com.

## Usage
Open the CRM locally without a build step. If quieres que el botón "Buscar y rellenar datos" intente leer automáticamente la página de patentechile.com, usa el servidor incluido:

```bash
# en este directorio
python server.py
```

Luego abre http://localhost:8000/index.html en tu navegador y usa `index.html` para:

- Ingresar una patente, segmento y notas copiadas desde patentechile.com.
- Desplegar la ficha manual solo cuando la necesitas para copiar características clave (modelo, año, origen, permiso de
  circulación, fecha de la última R.T., kilometraje y precio de referencia) y elegir el segmento antes de guardar.
- Subir una captura o PDF de la consulta (por ejemplo un print de patentechile.com) para que el sitio intente extraer los
  valores automáticamente con OCR (Tesseract.js + pdf.js). También admite el flujo manual si prefieres completar a mano.
- Guardar el registro en `localStorage` para que quede tu historial local.
- Filtrar por patente o segmento, copiar patentes al portapapeles y eliminar entradas.

Notas:

- El front-end intenta rellenar automáticamente desde patentechile.com: primero usa el proxy local (`/api/proxy` con `server.py`) y, si estás en un hosting estático, prueba con dos proxies públicos (AllOrigins y Jina AI). Si todos fallan, igual verás un aviso para pegar los datos manualmente.
- Variables de entorno útiles para ajustar la conexión: `PATENTECHILE_ORIGIN` (cambiar la URL base si usas un mirror o proxy propio), `PATENTECHILE_ATTEMPTS` (reintentos, por defecto 3) y `PATENTECHILE_TIMEOUT` (timeout por intento en segundos, por defecto 20).
- Si no necesitas el proxy y solo quieres abrir la página estática, también puedes ejecutar `python -m http.server 8000` y abrir http://localhost:8000; el botón de búsqueda usará los proxies públicos y, si responden, llenará la ficha.

### Publicar en GitHub Pages

La interfaz es 100% estática, por lo que puedes servirla en GitHub Pages para consultarla desde cualquier dispositivo. Solo recuerda que el autollenado vía proxy **no** puede ejecutarse en Pages; necesitarás correr `python server.py` en local para esa función. Para dejarla online:

1. Crea un repositorio en GitHub y sube estos archivos a la rama `main`.
2. Asegúrate de que la opción Pages esté configurada con origen "GitHub Actions" (no "branch").
3. El flujo de trabajo `.github/workflows/deploy.yml` subirá el contenido de la raíz al sitio de Pages cada vez que hagas push a `main` o `work`, o ejecutes el workflow manualmente desde la pestaña *Actions*.
4. Accede a la URL de Pages publicada para usar el CRM en modo manual (buscar en patentechile.com, copiar los datos y guardarlos aquí).

Si no ves los últimos cambios en Pages (por ejemplo, sigues viendo el fondo claro), fuerza un *hard refresh* (Ctrl+Shift+R) o edita las query strings de los assets en `index.html` (por ejemplo `styles.css?v=2024-06-22` y `script.js?v=2024-06-22`) para obligar al navegador a descargar la versión nueva. Cada vez que subas cambios, aumenta el número de versión para evitar que el navegador siga usando archivos antiguos.

Recuerda también que el botón "Buscar en patentechile.com" usa varias rutas: si corres `python server.py` responderá el proxy local; si estás en GitHub Pages probará con dos proxies públicos. Si ninguno responde, el aviso te pedirá abrir la web oficial y pegar los datos manualmente.

En la parte superior de la interfaz verás un aviso de modo (estático o local) junto con el número de versión que se cargó. Si no coincide con la versión que acabas de publicar, fuerza un refresh o abre en una ventana de incógnito hasta que el número se actualice.

Para una verificación rápida del intérprete de Python también puedes ejecutar:

```bash
python example.py
```

### Checklist rápido cuando no ves cambios en Pages

1. **Confirma el branch**: asegúrate de haber hecho push a `main` o `work` (son los que disparan el deploy).
2. **Revisa el workflow**: en la pestaña *Actions* verifica que el job "Deploy static content to Pages" esté en verde y corra sobre tu último commit.
3. **Origen de Pages**: en Settings → Pages confirma que el origen es **GitHub Actions** (no "branch").
4. **Versión de assets**: en `index.html` actualiza las query strings de CSS/JS y la constante `APP_VERSION` en `script.js` al mismo valor (ej. `2024-06-23`) antes de hacer push.
5. **Espera la propagación**: GitHub suele tardar 1-2 minutos después del workflow en reflejar el build.
6. **Forza la recarga**: abre la URL pública (usa el path completo, por ejemplo `https://usuario.github.io/repositorio/`). Luego pulsa Ctrl+Shift+R o prueba en una ventana de incógnito.
7. **Verifica la etiqueta**: en la esquina superior derecha de la página deberías ver la pill con el texto `v<tu versión> · modo…`. Si no coincide, sigues viendo la copia vieja.
8. **Autollenado**: recuerda que el botón intentará usar los proxies públicos; si fallan, prueba en tu computador corriendo `python server.py`.

### Cómo resolver conflictos de merge en GitHub

Si al editar los archivos en GitHub ves marcadores de conflicto (con botones como **Accept current change** o **Accept incoming change**), sigue estos pasos:

1. Revisa cada bloque marcado. Verás dos versiones del mismo fragmento separadas por los marcadores `<<<<<<<`, `=======` y `>>>>>>>`.
2. Elige la versión correcta para cada bloque usando los botones que aparecen en la parte superior del editor: 
   - **Accept current change** conserva lo que ya estaba en tu rama.
   - **Accept incoming change** conserva lo que viene de la otra rama.
   - **Accept both changes** fusiona las dos versiones si ambas son necesarias.
3. Después de aceptar, edita el bloque resultante para dejarlo limpio y coherente (sin los marcadores de conflicto) y guarda el archivo.
4. Repite para todos los bloques con conflictos, confirma la resolución y vuelve a hacer commit/push.

Consejo: si dudas de qué versión elegir, abre el archivo en otra pestaña para ver el contexto completo o compara con el historial de commits para asegurarte de que no se pierde información importante.

Feel free to add additional files or notes as needed for your experiments.

### Cómo pasar tus cambios de este sandbox a tu repositorio de GitHub (sin copiar/pegar)

Si ya ves la app funcionando aquí pero en GitHub Pages sigue antigua, evita copiar y pegar archivo por archivo. Empuja los
commits directamente desde este sandbox a tu repo en GitHub siguiendo estos pasos:

1. **Configura el remoto** (solo la primera vez):
   ```bash
   git remote set-url origin https://github.com/<tu-usuario>/<tu-repo>.git
   ```
   O, si el remoto no existe aún:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   ```
2. **Confirma que estás en la rama correcta** (usa `main` o `work`, que son las que disparan el deploy de Pages aquí):
   ```bash
   git branch
   # si necesitas crearla o moverte
   git checkout -B work
   ```
3. **Agrega y commitea tus cambios** (sin pegar manualmente):
   ```bash
   git status -sb
   git add .
   git commit -m "Actualiza CRM oscuro y buscador"
   ```
4. **Haz push al remoto**:
   ```bash
   git push origin work
   # o git push origin main, según tu flujo
   ```
5. **Verifica el deploy**: abre la pestaña *Actions* en GitHub y confirma que el workflow "Deploy static content to Pages" corrió
   sobre ese commit. Cuando termine en verde, espera 1–2 minutos y recarga tu URL de Pages con Ctrl+Shift+R.

Si sigues este flujo, todo el árbol de archivos se sincroniza sin tener que copiar/pegar manualmente y GitHub Pages recibirá la
versión exacta que ves aquí.
