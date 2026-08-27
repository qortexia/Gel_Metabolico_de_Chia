# Gel Metabólico de Chía — Quiz MX

Funil de quiz interactivo en español (México) para el producto "Gel Metabólico de Chía".

## Desarrollo

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `NEXT_PUBLIC_VSL1_URL` | URL del video VSL 1 (receta) | `/videos/vsl1.mp4` |
| `NEXT_PUBLIC_VSL2_URL` | URL del video VSL 2 (oferta) | `/videos/vsl2.mp4` |
| `NEXT_PUBLIC_CHECKOUT_URL` | URL de checkout de Kiwify | `https://pay.kiwify.com/6KqFZyK` |
| `NEXT_PUBLIC_OFFER_PRICE_MXN` | Precio mostrado en la oferta (MXN) | `199` |
| `NEXT_PUBLIC_META_PIXEL_ID` | ID del Pixel/dataset de Meta (público) | — (sin él, no carga el Pixel) |
| `HUB_URL` | Origen de qx-hub; `next.config.js` reescribe `/api/e/*` hacia `${HUB_URL}/api/*` (solo servidor, tiempo de build) | — |

`NEXT_PUBLIC_META_PIXEL_ID` se inlinea en tiempo de build: hay que configurarla en Vercel (Production
y Preview) ANTES del deploy que deba llevarla; cambiarla requiere un nuevo deploy. `HUB_URL` también es
de build (Production + Preview); ejemplo: `https://qx-hub.vercel.app`. Sin `HUB_URL` el sitio sigue
funcionando solo con el Pixel del navegador (los eventos no llegan al hub).

## Pruebas

```bash
npm test
```

## Deploy

Conectar este repositorio a un proyecto de Vercel y configurar las variables de entorno de la
tabla anterior en el dashboard del proyecto (Production + Preview). No requiere base de datos. Todos
los eventos de tracking se envían a `/api/e/ingest`, que `next.config.js` reescribe (rewrite de
primera parte) hacia qx-hub (`HUB_URL`); el hub es quien habla con Supabase y con la Conversions
API de Meta.
