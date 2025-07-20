# FlowSQL

FlowSQL es una herramienta de análisis de trazabilidad SQL que te permite visualizar las relaciones entre tablas a partir de scripts `INSERT INTO ... SELECT ... FROM ...`. La herramienta genera una tabla con el mapeo de campos y un diagrama de flujo que ilustra las dependencias.

## Despliegue

La aplicación está desplegada en GitHub Pages y puedes acceder a ella a través del siguiente enlace:

[https://mjmc4498.github.io/FlowSQL/](https://mjmc4498.github.io/FlowSQL/app/views/index.html)

## Instalación

Para utilizar FlowSQL en tu entorno local, sigue estos pasos:

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/mjmc4498/FlowSQL.git
    ```
2.  **Navega al directorio del proyecto:**
    ```bash
    cd FlowSQL
    ```
3.  **Abre el archivo `index.html`:**
    Abre el archivo `app/views/index.html` en tu navegador web.

## Manual del sistema y uso

1.  **Carga tu script SQL:** puedes cargar un archivo `.sql` haciendo clic en el botón "Seleccionar archivo" o pegar directamente el contenido de tu script en el área de texto.
2.  **Analiza el SQL:** haz clic en el botón "Analizar".
3.  **Visualiza los resultados:**
    *   **Tabla de trazabilidad:** aparecerá una tabla que detalla el mapeo de la tabla y el campo de origen a la tabla y el campo de destino, incluyendo cualquier lógica de transformación aplicada.
    *   **Diagrama de flujo:** se generará un diagrama que muestra la relación entre las tablas de origen y destino.

## Contribuciones

¡Las contribuciones son bienvenidas! Si tienes alguna idea para mejorar FlowSQL, no dudes en abrir un *issue* o enviar un *pull request*.

## Autor

[mjmc4498](https://github.com/mjmc4498)
