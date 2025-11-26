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
- Guardar el registro en `localStorage` para que quede tu historial local.
- Filtrar por patente o segmento, copiar patentes al portapapeles y eliminar entradas.

Notas:

- El proxy local usa la librería estándar para traer el HTML público de patentechile.com, extraer la tabla de resultados (Patente, Tipo, Marca, etc.) y rellenar el campo de notas con esos pares clave/valor. Si el entorno bloquea las conexiones salientes verás un aviso y podrás copiar la información manualmente.
- Variables de entorno útiles para ajustar la conexión: `PATENTECHILE_ORIGIN` (cambiar la URL base si usas un mirror o proxy propio), `PATENTECHILE_ATTEMPTS` (reintentos, por defecto 3) y `PATENTECHILE_TIMEOUT` (timeout por intento en segundos, por defecto 20).
- El entorno de este sandbox devuelve actualmente un 403 al contactar patentechile.com, por lo que el autollenado no puede verificarse aquí. En tu red local, donde la página responde, verás que el servidor devuelve los campos ya estructurados y los copia al formulario.
- Si no necesitas el proxy y solo quieres abrir la página estática, también puedes ejecutar `python -m http.server 8000` y abrir http://localhost:8000.

### Publicar en GitHub Pages

La interfaz es 100% estática, por lo que puedes servirla en GitHub Pages para consultarla desde cualquier dispositivo. Solo recuerda que el autollenado vía proxy **no** puede ejecutarse en Pages; necesitarás correr `python server.py` en local para esa función. Para dejarla online:

1. Crea un repositorio en GitHub y sube estos archivos a la rama `main`.
2. Asegúrate de que la opción Pages esté configurada con origen "GitHub Actions" (no "branch").
3. El flujo de trabajo `.github/workflows/deploy.yml` subirá el contenido de la raíz al sitio de Pages cada vez que hagas push a `main` o `work`, o ejecutes el workflow manualmente desde la pestaña *Actions*.
4. Accede a la URL de Pages publicada para usar el CRM en modo manual (buscar en patentechile.com, copiar los datos y guardarlos aquí).

Si no ves los últimos cambios en Pages (por ejemplo, sigues viendo el fondo claro), fuerza un *hard refresh* (Ctrl+Shift+R) o edita las query strings de los assets en `index.html` (por ejemplo `styles.css?v=2024-06-20b` y `script.js?v=2024-06-20b`) para obligar al navegador a descargar la versión nueva. Cada vez que subas cambios, aumenta el número de versión para evitar que el navegador siga usando archivos antiguos.

Recuerda también que el botón "Buscar en patentechile.com" solo funciona si hay un servidor que responda `/api/proxy` (por ejemplo, ejecutando `python server.py`). En GitHub Pages la página es estática y ese endpoint no existe, así que verás un aviso de que debes abrir la web oficial y pegar los datos manualmente.

Para una verificación rápida del intérprete de Python también puedes ejecutar:

```bash
python example.py
```

### Checklist rápido cuando no ves cambios en Pages

1. **Confirma el branch**: asegúrate de haber hecho push a `main` o `work` (son los que disparan el deploy).
2. **Revisa el workflow**: en la pestaña *Actions* verifica que el job "Deploy static content to Pages" esté en verde y corra sobre tu último commit.
3. **Origen de Pages**: en Settings → Pages confirma que el origen es **GitHub Actions** (no "branch").
4. **Versión de assets**: en `index.html` actualiza las query strings de CSS/JS y la constante `APP_VERSION` en `script.js` al mismo valor (ej. `2024-06-20b`) antes de hacer push.
5. **Espera la propagación**: GitHub suele tardar 1-2 minutos después del workflow en reflejar el build.
6. **Forza la recarga**: abre la URL pública (usa el path completo, por ejemplo `https://usuario.github.io/repositorio/`). Luego pulsa Ctrl+Shift+R o prueba en una ventana de incógnito.
7. **Verifica la etiqueta**: en la esquina superior derecha de la página deberías ver la pill con el texto `v<tu versión> · modo…`. Si no coincide, sigues viendo la copia vieja.
8. **Autollenado**: recuerda que el botón de "Buscar" no funciona en Pages; para probarlo debes correr `python server.py` en tu computador y abrir la versión local.

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
