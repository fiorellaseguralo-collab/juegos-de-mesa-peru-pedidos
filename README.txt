# Juegos de Mesa Perú - Pedidos Cloud

Versión profesional preparada para conectar a Supabase.

## Instalación
1. Crear un proyecto en Supabase.
2. Abrir SQL Editor y ejecutar schema.sql.
3. Copiar Project URL y Anon Key.
4. Pegarlos en app.js:
   SUPABASE_URL
   SUPABASE_ANON_KEY
5. Publicar esta carpeta en un hosting estático (Netlify, Vercel, GitHub Pages, etc.).
6. Configurar Authentication > URL Configuration con el dominio publicado.

## Incluye
- Autenticación de usuarios.
- Base de datos PostgreSQL en la nube.
- Pedidos centralizados.
- ID automático JMP-00001.
- Dashboard.
- Estados.
- Cálculo de total/adelanto/saldo.
- WhatsApp.
- Interfaz móvil/PWA-ready.

## Próxima fase recomendada
Crear tabla profiles con roles administrador/vendedor, catálogo de productos, permisos RLS por rol, exportación Excel/CSV desde servidor, auditoría e instalación PWA con iconos.
