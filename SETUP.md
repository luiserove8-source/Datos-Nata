# GestorActas – Configuración Firebase

## 1. Crear proyecto Firebase

1. Ve a https://console.firebase.google.com
2. **Crear proyecto** → ponle un nombre (ej: `gestor-actas`)
3. Activa **Google Analytics** si deseas (opcional)

## 2. Habilitar Authentication

1. En Firebase Console → **Authentication** → **Comenzar**
2. Pestaña **Sign-in method** → habilitar **Correo electrónico/Contraseña**

## 3. Crear Firestore Database

1. **Firestore Database** → **Crear base de datos**
2. Elige **Modo de producción** (las reglas ya están en `firestore.rules`)
3. Selecciona la región más cercana (ej: `us-central1`)

## 4. Obtener credenciales

1. **Configuración del proyecto** (ícono ⚙️) → **Tus apps** → **</>** (Web)
2. Registra la app, copia el objeto `firebaseConfig`

## 5. Crear archivo .env

Copia `.env.example` a `.env` y rellena con tus credenciales:

```bash
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 6. Crear el primer usuario administrador

Desde Firebase Console → **Authentication** → **Agregar usuario**:
- Email: `admin@tudominio.com`
- Contraseña: la que elijas

Luego en **Firestore** → colección `usuarios` → **Agregar documento**:
```json
{
  "uid": "<uid del usuario que aparece en Authentication>",
  "username": "admin",
  "email": "admin@tudominio.com",
  "isAdmin": true,
  "activo": true
}
```

## 7. Desplegar reglas de Firestore

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # selecciona tu proyecto
firebase deploy --only firestore:rules
```

## 8. Ejecutar en desarrollo

```bash
npm install
npm run dev
```

## 9. Desplegar en Firebase Hosting (opcional)

```bash
npm run build
firebase deploy --only hosting
```

## Estructura de colecciones Firestore

| Colección   | Campos principales                                                         |
|-------------|---------------------------------------------------------------------------|
| `usuarios`  | uid, username, email, isAdmin, activo, creadoEn                           |
| `actas`     | numeroConsecutivo, descripcion, fecha, userId, creadoPor, creadoEn, bloqueada |
| `contadores`| ultimo (número del último consecutivo)                                    |
| `auditoria` | userId, username, accion, detalle, timestamp                              |
