# Ctrl+C

Aplicación web progresiva para gestionar productos entregados en consignación.

Permite registrar clientes, productos, entregas, unidades vendidas o devueltas, pagos, comisiones y comprobantes para enviar por WhatsApp.

## Funciones principales

- Registro y edición de clientes.
- Número de WhatsApp para cada cliente.
- Comisión personalizada para cada comercio.
- Catálogo de productos.
- Precios y costos editables.
- Marcas o categorías personalizadas.
- Imágenes propias para cada producto.
- Registro de entregas en consignación.
- Seguimiento de productos vendidos, devueltos y pendientes.
- Registro de pagos.
- Cálculo automático de comisiones y saldos.
- Informes de ventas, costos y ganancias.
- Separación de ganancias entre compras y ahorro.
- Filtros por cliente, estado y marca.
- Comprobantes y seguimientos enviados por WhatsApp.
- Exportación e importación de respaldos en formato JSON.
- Funcionamiento sin conexión mediante PWA.

## Almacenamiento

Los datos y las imágenes se guardan en el `localStorage` del navegador.

La información permanece únicamente en el navegador y dispositivo utilizado. Para trasladar los datos a otro celular o computadora se debe utilizar la opción **Exportar copia** y luego **Importar copia**.

Se recomienda realizar respaldos periódicamente.

## Uso local

Abrir la carpeta del proyecto con un servidor local, por ejemplo mediante la extensión **Live Server** de Visual Studio Code.

No se recomienda abrir directamente el archivo `index.html`, porque algunas funciones de la PWA y el Service Worker necesitan ejecutarse desde un servidor.

## Instalación

Al publicarse mediante HTTPS, Ctrl+C puede instalarse como una aplicación desde el navegador del celular o de la computadora.

La aplicación puede continuar funcionando sin conexión después de haber sido cargada por primera vez.

## Publicación

Ctrl+C es una aplicación estática desarrollada con HTML, CSS y JavaScript.

Puede publicarse gratuitamente utilizando GitHub Pages.

## Estructura

```text
Ctrl-C/
├── css/
│   └── styles.css
├── images/
│   ├── ctrl-icon.png
│   ├── ctrl.jpg
│   ├── ctrl.png
│   └── icon.svg
├── js/
│   ├── app.js
│   └── sw.js
├── .gitignore
├── .nojekyll
├── index.html
├── manifest.webmanifest
└── README.md