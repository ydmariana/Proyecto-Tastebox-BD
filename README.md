# TasteBox

Plataforma web de recetas con catálogo por categorías, cuentas de usuario, planes de suscripción (gratuito y premium), colecciones personales, reseñas y panel de administración.

Proyecto del **Caso 6 — TasteBox** · Universidad de San Buenaventura, Sede Bogotá · Ingeniería Multimedia.

**Equipo:** Valentina Cruz Fabra · Yadi Mariana Javier Arias · Maria Sofia Socha Estupiñán

---

## Funcionalidades

- **Catálogo de recetas** (256 recetas) organizado por categorías: desayunos, almuerzos, sopas, pastas, carnes, pescados, postres, malteadas, etc. Con búsqueda y recetas destacadas, y sin necesidad de iniciar sesión.
- **Registro e inicio de sesión** con contraseñas protegidas con `scrypt`.
- **Planes de suscripción:** gratuito (límite mensual de recetas) y premium (sin límite y caja de ingredientes), con fecha de inicio, renovación y vencimiento.
- **Colecciones personales** y recetas guardadas, separadas del catálogo general.
- **Reseñas:** calificación de 1 a 5 (más comentario, etiquetas y "volvería a cocinarla").
- **Perfil de usuario:** datos personales, cambio de contraseña, foto, mis hábitos y mis reseñas.
- **Panel de administración:** listar usuarios con su plan, y agregar, editar y eliminar recetas.

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend | HTML, CSS y JavaScript (sin frameworks), íconos Font Awesome, diseño a partir de un prototipo en Figma |
| Backend | Node.js + Express 5, arquitectura por capas (rutas → DAO → servicio MySQL) |
| Base de datos | MySQL (`mysql2`, consultas parametrizadas) |
| Seguridad | `scrypt` con sal aleatoria, CORS por lista de orígenes |
| Pruebas | `node:test`, jsdom (frontend) y colección de Postman |

## Estructura

```
Tastebox/
├── Backend/
│   ├── server.js            # Punto de entrada de la API
│   ├── routes/              # Rutas por recurso
│   ├── dao/                 # Lógica de acceso a datos
│   ├── services/            # Conexión MySQL
│   ├── utils/               # Hash de contraseñas, límites, validaciones, utilidades HTTP
│   ├── migrations/          # Cambios sobre el esquema original
│   ├── scripts/             # seed-recipes, create-admin, migrate-passwords
│   ├── tests/               # Pruebas de la API
│   └── BaseDef.sql          # Esquema de la base de datos + planes + catálogo
└── Frontend/
    ├── index.html
    ├── pages/               # Login, registro, perfil, colecciones, admin, etc.
    ├── js/                  # Lógica de cada página y cliente de la API (api.js)
    ├── img/                 # Imágenes de recetas y colecciones
    └── tests/               # Pruebas del frontend (jsdom)
```

## Instalación y ejecución

### Requisitos

- [Node.js](https://nodejs.org/) 22 o superior (las pruebas del backend usan `node:sqlite`)
- MySQL 8

### 1. Clonar el repositorio

```bash
git clone <URL-DEL-REPOSITORIO>
cd Tastebox
```

### 2. Crear la base de datos

Ejecuta el script en tu servidor MySQL (por ejemplo, desde MySQL Workbench o la consola):

```bash
mysql -u <usuario> -p < Backend/BaseDef.sql
```

Esto crea el esquema `tasteBox`, los planes **Gratuito** y **Premium** y el catálogo de recetas.

> Los archivos de `Backend/migrations/` solo hacen falta si tu base de datos viene de una versión anterior del esquema.

### 3. Configurar las variables de entorno

Crea el archivo `Backend/.env` (no se sube al repositorio):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=tasteBox

# Orígenes del frontend permitidos por CORS, separados por comas
ALLOWED_ORIGIN=http://localhost:5503
```

En desarrollo, cualquier puerto de `localhost` o `127.0.0.1` se acepta; con `NODE_ENV=production` solo vale la lista de `ALLOWED_ORIGIN`.

### 4. Iniciar el backend

```bash
cd Backend
npm install
npm start
```

La API queda en **http://localhost:5000** (se puede cambiar con la variable `PORT`).

### 5. Iniciar el frontend

Sirve la carpeta `Frontend/` con cualquier servidor estático, por ejemplo la extensión **Live Server** de VS Code (el proyecto trae configurado el puerto `5503`) y abre `Frontend/index.html`.

Si la API corre en otra dirección, define `window.TASTEBOX_API_URL` antes de cargar `js/config.js`.

## Scripts del backend

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia la API |
| `npm test` | Ejecuta las pruebas |
| `npm run seed-recipes` | Carga el catálogo de recetas (acepta `--dry-run`) |
| `npm run create-admin -- correo contraseña` | Crea un administrador, o promueve a uno existente (sin cambiar su contraseña) |
| `npm run migrate-passwords` | Migra contraseñas en texto plano a `scrypt` (acepta `--dry-run`) |
