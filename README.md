# Conversor BPP a MPR para BHX50 (MVP funcional)

MVP web para convertir programas de mecanizado `.bpp` a un `.mpr` preliminar para BHX50.

## ¿Dónde probar la app?

En local:

```bash
npm install
npm run dev
```

Luego abrí en navegador la URL que imprime Vite (normalmente `http://localhost:5173`).

## Flujo interactivo

1. Cargar archivo `.bpp` o usar ejemplo.
2. Editar/pegar contenido BPP.
3. Ver parser en vivo (sin botón de procesar).
4. Ajustar diccionario de equivalencias operación -> macro BHX50.
5. Previsualizar y exportar `.mpr`.

## Operaciones detectadas (inspirado en BppLib)

- `Bv`
- `Bh`
- `Bg`
- `CutX`
- `CutY`
- `Rout`
- `Pock`

## Build

```bash
npm run build
```

## Nota

El writer de `.mpr` es simple para MVP. La sintaxis final debe validarse con piezas reales en BHX50/woodWOP.
