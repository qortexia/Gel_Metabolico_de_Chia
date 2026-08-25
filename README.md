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
| `NEXT_PUBLIC_META_PIXEL_ID` | ID del Pixel/dataset de Meta (público) | — (sin él, no carga el Pixel ni el CAPI) |
| `META_CAPI_ACCESS_TOKEN` | Token de System User para la Conversions API (solo servidor) | — |
| `META_TEST_EVENT_CODE` | Código de "Test Events" del Events Manager; definir solo durante QA | vacío |
| `META_GRAPH_VERSION` | Versión del Graph API | `v23.0` |

`NEXT_PUBLIC_META_PIXEL_ID` se inlinea en tiempo de build: hay que configurarla en Vercel (Production
y Preview) ANTES del deploy que deba llevarla; cambiarla requiere un nuevo deploy. Si falta
`NEXT_PUBLIC_META_PIXEL_ID` o `META_CAPI_ACCESS_TOKEN`, `/api/e/capi` responde 503 y el funil sigue
funcionando solo con el Pixel del navegador (o sin tracking alguno si falta el pixel id).

## Pruebas

```bash
npm test
```

## Deploy

Conectar este repositorio a un proyecto de Vercel y configurar las variables de entorno de la
tabla anterior en el dashboard del proyecto (Production + Preview). No requiere base de datos. El
route handler `/api/e/capi` reenvía los eventos del Pixel a la Conversions API de Meta (mismo
`event_id`, deduplicado).
