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
3. El flujo de trabajo `.github/workflows/deploy.yml` subirá el contenido de la raíz al sitio de Pages cada vez que hagas push a `main` o ejecutes el workflow manualmente desde la pestaña *Actions*.
4. Accede a la URL de Pages publicada para usar el CRM en modo manual (buscar en patentechile.com, copiar los datos y guardarlos aquí).

Para una verificación rápida del intérprete de Python también puedes ejecutar:

```bash
python example.py
```

Feel free to add additional files or notes as needed for your experiments.
