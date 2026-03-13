# Conversor BPP a BHX50

Aplicación web (React + Vite) para:

- importar archivos de mecanizado `.bpp`,
- visualizar operaciones detectadas,
- convertirlas a un formato de salida compatible con BHX50,
- y descargar el resultado como `.bhx`.

> Nota: la conversión implementada es una base configurable. Si compartes ejemplos reales de entrada/salida de tu BHX50, se puede ajustar el mapeo exacto de comandos.

## Ejecutar localmente

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abre `http://localhost:5173`.

## Build de producción

```bash
npm run build
```
