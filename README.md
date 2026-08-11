# Manos que Ayudan — MVP

App web/móvil (mobile-first) para transformar la empatía pasiva en acción
directa: sensibilización activa y respuesta coordinada ante emergencias
sociales y ambientales.

## Stack

- **Frontend:** React / Next.js (App Router) + Tailwind CSS
- **Backend / BBDD:** Supabase (PostgreSQL + Auth + RLS)
- **IA:** Google Gemini API para "Smart Skill-Matching"

## Estructura

```
manos-que-ayudan/
├── supabase/
│   └── schema.sql              # Esquema completo + RLS + seed de habilidades
├── app/
│   ├── components/
│   │   ├── ProfileSkills.jsx       # Perfil del voluntario (chips de habilidades)
│   │   └── PonteEnSusZapatos.jsx   # Módulo interactivo de empatía
│   ├── lib/
│   │   ├── supabaseClient.js       # Cliente de Supabase (browser)
│   │   └── geminiMatching.js       # Lógica de matching con Gemini (server-only)
│   └── api/
│       └── smart-match/route.js    # Endpoint que expone geminiMatching al frontend
├── tailwind.config.js          # Tokens de color del diseño (fondo, texto, acento)
├── package.json
└── .env.example
```

## Puesta en marcha

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea un proyecto en [supabase.com](https://supabase.com) y ejecuta
   `supabase/schema.sql` en el SQL Editor.
3. Copia `.env.example` a `.env.local` y completa tus claves:
   ```bash
   cp .env.example .env.local
   ```
4. Corre el proyecto:
   ```bash
   npm run dev
   ```

## Notas de diseño

- Mobile-first, una sola columna, bottom navigation.
- Paleta: fondo `#F8F9FA`, texto `#1F2937`, único acento `#2E5A44` (verde
  hoja calmo). Sin rojos de alerta ni contadores dramáticos.
- Touch targets ≥ 48px en chips y botones.

## Próximos pasos sugeridos

- Componente de Feed de causas (`causes` + `impact_updates`).
- Bottom Navigation Bar compartida entre vistas.
- Autenticación con Supabase Auth (magic link o OAuth).
- Tabla `volunteer_actions` para registrar cuando alguien activa su
  voluntariado en una causa (referenciada pero no incluida en el MVP
  mínimo solicitado).
