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

## Pruebas

```bash
npm test
```

## Deploy

Conectar este repositorio a un proyecto de Vercel y configurar las variables de entorno de la
tabla anterior en el dashboard del proyecto (Production + Preview). No requiere base de datos
ni backend.
