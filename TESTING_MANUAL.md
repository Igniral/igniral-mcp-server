# Manual de Pruebas — Igniral MCP Server + Agent API Keys

> **Versión:** 1.0.0  
> **Fecha:** 15 de abril de 2026  
> **Autor:** Equipo Igniral  

---

## Índice

1. [Prerrequisitos](#1-prerrequisitos)
2. [Fase 1: Verificar el Backend (Auth Server)](#2-fase-1-verificar-el-backend-auth-server)
3. [Fase 2: Verificar el Dashboard](#3-fase-2-verificar-el-dashboard)
4. [Fase 3: Verificar el Token OAuth2](#4-fase-3-verificar-el-token-oauth2)
5. [Fase 4: Verificar el MCP Server](#5-fase-4-verificar-el-mcp-server)
6. [Fase 5: Prueba End-to-End con Claude Desktop / Cursor](#6-fase-5-prueba-end-to-end-con-claude-desktop--cursor)
7. [Casos de Error Esperados](#7-casos-de-error-esperados)
8. [Checklist Final](#8-checklist-final)

---

## 1. Prerrequisitos

### Servicios que deben estar corriendo

| Servicio | Puerto por defecto | Descripción |
|----------|-------------------|-------------|
| `igniral-auth-server` | `8081` | Servidor de autenticación OAuth2 |
| `igniral-dashboard` | `8083` | Dashboard de administración |
| `igniral-microservice-json-elements` | `8092` | Microservicio CRUD de datos |
| `igniral-microservice-ai-schema-builder` | `8093` | Microservicio de generación AI |

### Herramientas necesarias

- **Node.js** v18+ (para el MCP Server)
- **npm** (incluido con Node.js)
- **curl** o **Postman** (para pruebas manuales de API)
- **jq** (opcional, para formatear JSON en terminal)
- Una cuenta de usuario activa en el sistema Igniral

### Preparar el MCP Server

```bash
cd igniral-mcp-server
npm install
npm run build
```

Verifica que la compilación fue exitosa y que se creó el directorio `dist/`.

---

## 2. Fase 1: Verificar el Backend (Auth Server)

### 2.1. Verificar que la tabla `agent_api_keys` fue creada

Conectarse a la base de datos y ejecutar:

```sql
DESCRIBE agent_api_keys;
-- Columnas esperadas: id, user_id, client_id, label, created_at, revoked_at
```

### 2.2. Crear un Agent API Key vía API directa

Primero, obtener un token de sesión del usuario (login normal en el Dashboard y extraer el JWT del cookie o usar el token del authorized client).

```bash
# Reemplazar <USER_JWT> con un JWT válido del usuario logueado
curl -X POST http://localhost:8081/api/agent-keys \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"label": "Test Key Manual"}'
```

**Respuesta esperada (201 Created):**
```json
{
  "id": "uuid-generado",
  "clientId": "agent-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "clientSecret": "texto-plano-del-secreto-generado",
  "label": "Test Key Manual",
  "createdAt": "2026-04-15T17:00:00.000+00:00"
}
```

> ⚠️ **IMPORTANTE:** Copiar el `clientId` y `clientSecret` inmediatamente. El `clientSecret` solo se muestra una vez — está almacenado hasheado (BCrypt) en la tabla `oauth2_registered_client`.

### 2.3. Listar Agent API Keys

```bash
curl http://localhost:8081/api/agent-keys \
  -H "Authorization: Bearer <USER_JWT>"
```

**Respuesta esperada (200 OK):**
```json
[
  {
    "id": "uuid-generado",
    "clientId": "agent-xxxxxxxx...",
    "label": "Test Key Manual",
    "createdAt": "2026-04-15T17:00:00.000+00:00",
    "revokedAt": null
  }
]
```

### 2.4. Verificar límites por suscripción

Intentar crear más keys de las permitidas por el plan del usuario:

| Plan | Límite |
|------|--------|
| FREE | 1 |
| STANDARD | 3 |
| PRO | 5 |
| ENTERPRISE | 10 |

```bash
# Si el usuario tiene plan FREE y ya tiene 1 key, esta llamada debe fallar:
curl -X POST http://localhost:8081/api/agent-keys \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"label": "Should Fail"}'
```

**Respuesta esperada (400 Bad Request):** Mensaje indicando que se alcanzó el límite.

### 2.5. Revocar un Agent API Key

```bash
curl -X DELETE http://localhost:8081/api/agent-keys/<KEY_ID> \
  -H "Authorization: Bearer <USER_JWT>"
```

**Respuesta esperada:** `204 No Content`

**Verificar:** La key ya no aparece en el listado, y el `RegisteredClient` fue eliminado de la tabla `oauth2_registered_client`.

---

## 3. Fase 2: Verificar el Dashboard

### 3.1. Verificar el link en el sidebar

1. Iniciar sesión en el Dashboard (`http://localhost:8080`)
2. En el menú lateral izquierdo, verificar que aparezca el enlace **"Agent API Keys"** con el icono de robot (🤖)
3. El link debe estar ubicado **debajo** de "Subscription" y **arriba** de "Help"

### 3.2. Verificar la vista de Agent API Keys

1. Hacer clic en **"Agent API Keys"**
2. La URL debe ser `/settings/agent-keys`
3. Verificar que se muestra:
   - Título "Agent API Keys"  
   - Card informativa con instrucciones de uso
   - Tabla de keys existentes (o mensaje vacío si no hay ninguna)
   - Botón "Create Agent Key"

### 3.3. Crear una key desde el Dashboard

1. Hacer clic en **"Create Agent Key"**
2. En el modal, escribir un label (ej: "Mi Cursor IDE")
3. Hacer clic en **"Generate Key"**
4. **Verificar:**
   - El modal muestra el paso 2 con `Client ID` y `Client Secret`
   - Ambos campos tienen botones de copiar
   - Aparece advertencia de que el secret no se mostrará de nuevo
5. Hacer clic en "Done" → la tabla debe mostrar la nueva key

### 3.4. Revocar una key desde el Dashboard

1. En la tabla, hacer clic en **"Revoke"** junto a una key
2. Confirmar en el diálogo de confirmación
3. La página se recarga y la key ya no aparece en la tabla

---

## 4. Fase 3: Verificar el Token OAuth2

Esta es la prueba más crítica: verificar que las credenciales del Agent API Key generan un JWT con los claims correctos.

### 4.1. Obtener un token con `client_credentials`

Usar el `clientId` y `clientSecret` obtenidos en la Fase 1:

```bash
# Codificar clientId:clientSecret en Base64
CLIENT_ID="agent-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
CLIENT_SECRET="el-secreto-obtenido"
BASIC_AUTH=$(echo -n "$CLIENT_ID:$CLIENT_SECRET" | base64)

curl -X POST http://localhost:8081/oauth2/token \
  -H "Authorization: Basic $BASIC_AUTH" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"
```

**Respuesta esperada (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 7200
}
```

### 4.2. Decodificar y verificar el JWT

Copiar el `access_token` y decodificarlo en [jwt.io](https://jwt.io) o con:

```bash
# Decodificar el payload (segunda parte del JWT)
echo "<access_token>" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

**Claims esperados en el payload:**

```json
{
  "sub": "user-uuid-del-propietario",     // ← ID del usuario dueño de la key
  "username": "nombre-de-usuario",         // ← username del propietario
  "subscription": "FREE",                  // ← plan de suscripción actual
  "aud": "agent-xxxxxxxx...",              // ← client id como audience
  "iss": "http://localhost:8081",          // ← emisor (auth server)
  "exp": 1744739200                        // ← expiración (2 horas)
}
```

> ⚠️ **Puntos críticos a verificar:**
> - `sub` **DEBE SER** el UUID del usuario propietario, **NO** el `clientId`
> - `subscription` debe reflejar el plan real del usuario
> - `expires_in` debe ser `7200` (2 horas)

### 4.3. Usar el token para llamar un microservicio

Con el token obtenido, verificar que el microservicio identifica al usuario correctamente:

```bash
ACCESS_TOKEN="eyJhbGciOi..."

# Listar aplicaciones del usuario (json-elements)
curl http://localhost:8092/api/igniral-user-application?page=0\&size=5 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Resultado esperado:** La misma lista de aplicaciones que el usuario ve en el Dashboard.

### 4.4. Verificar que el token revocado falla

1. Revocar la key (Fase 1, paso 2.5 o desde el Dashboard)
2. Intentar obtener un nuevo token con las mismas credenciales:

```bash
curl -X POST http://localhost:8081/oauth2/token \
  -H "Authorization: Basic $BASIC_AUTH" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"
```

**Resultado esperado:** `401 Unauthorized` — el `RegisteredClient` ya no existe.

---

## 5. Fase 4: Verificar el MCP Server

### 5.1. Configurar el `.env`

```bash
cd igniral-mcp-server
cp .env.example .env
```

Editar `.env` con las credenciales reales:

```env
IGNIRAL_CLIENT_ID=agent-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
IGNIRAL_CLIENT_SECRET=el-secreto-obtenido
IGNIRAL_AUTH_URL=http://localhost:8081
IGNIRAL_API_URL=http://localhost:8092
IGNIRAL_AI_API_URL=http://localhost:8093
```

### 5.2. Verificar que el servidor arranca correctamente

```bash
npm run build && npm start
```

**Salida esperada en stderr:**
```
Igniral MCP Server v1.0.0 started
Connected to API: http://localhost:8092
Connected to AI API: http://localhost:8093
Auth server: http://localhost:8081
```

Si falta alguna variable de entorno, el servidor debe arrojar un error descriptivo indicando cuáles faltan.

### 5.3. Probar con MCP Inspector

El MCP Inspector es una herramienta oficial para probar servidores MCP interactivamente:

```bash
npm run inspect
```

Esto abre una interfaz web donde puedes:

1. **Ver herramientas disponibles:** Verificar que las 4 tools están registradas:
   - `igniral_generate_schema_from_prompt`
   - `igniral_create_application`
   - `igniral_create_dynamic_endpoint`
   - `igniral_list_applications`

2. **Ejecutar `igniral_list_applications`:**
   - Hacer clic en la herramienta
   - No requiere parámetros
   - Debe retornar la lista de aplicaciones del usuario

3. **Ejecutar `igniral_create_application`:**
   ```json
   {
     "name": "MCP Test App",
     "description": "Application created from MCP Inspector for testing"
   }
   ```
   - Debe retornar `✅ Success. Application created.` con un `applicationId`

4. **Ejecutar `igniral_create_dynamic_endpoint`:**
   ```json
   {
     "applicationId": "<ID-del-paso-anterior>",
     "endpointPath": "/products",
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "schemaDefinition": {
       "$schema": "http://json-schema.org/draft-07/schema#",
       "type": "object",
       "properties": {
         "name": { "type": "string" },
         "price": { "type": "number" },
         "category": { "type": "string" }
       },
       "required": ["name", "price"]
     }
   }
   ```
   - Debe retornar `✅ Success. Dynamic endpoint created.`

5. **Ejecutar `igniral_generate_schema_from_prompt`:**
   ```json
   {
     "prompt": "Create a simple pet store API with endpoints for pets (name, breed, age, vaccinated), owners (name, email, phone), and appointments (date, service, pet, owner)"
   }
   ```
   - Esta operación tarda 30–90 segundos
   - Debe retornar `✅ Success. Application fully generated.`

### 5.4. Verificar auto-renovación del token

El `TokenManager` cachea el token y lo renueva automáticamente 30 segundos antes de expirar. Para probar esto:

1. Ejecutar una herramienta (se obtiene el primer token)
2. Esperar unos segundos
3. Ejecutar otra herramienta (debe reusar el token cacheado sin llamar al auth server)
4. Para forzar renovación: se puede reducir temporalmente el TTL del `RegisteredClient` en la base de datos

---

## 6. Fase 5: Prueba End-to-End con Claude Desktop / Cursor

### 6.1. Configurar Claude Desktop

Editar `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "igniral": {
      "command": "node",
      "args": ["/ruta/absoluta/a/igniral-mcp-server/dist/index.js"],
      "env": {
        "IGNIRAL_CLIENT_ID": "agent-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "IGNIRAL_CLIENT_SECRET": "el-secreto-obtenido",
        "IGNIRAL_AUTH_URL": "http://localhost:8081",
        "IGNIRAL_API_URL": "http://localhost:8092",
        "IGNIRAL_AI_API_URL": "http://localhost:8093"
      }
    }
  }
}
```

Reiniciar Claude Desktop después de guardar.

### 6.2. Configurar Cursor

Editar `.cursor/mcp.json` en la raíz de tu proyecto:

```json
{
  "mcpServers": {
    "igniral": {
      "command": "npx",
      "args": ["tsx", "/ruta/absoluta/a/igniral-mcp-server/src/index.ts"],
      "env": {
        "IGNIRAL_CLIENT_ID": "agent-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "IGNIRAL_CLIENT_SECRET": "el-secreto-obtenido",
        "IGNIRAL_AUTH_URL": "http://localhost:8081",
        "IGNIRAL_API_URL": "http://localhost:8092",
        "IGNIRAL_AI_API_URL": "http://localhost:8093"
      }
    }
  }
}
```

### 6.3. Pruebas conversacionales

Una vez conectado, probar estos prompts con el agente:

| # | Prompt de prueba | Resultado esperado |
|---|------------------|--------------------|
| 1 | "¿Qué aplicaciones tengo?" | El agente llama `igniral_list_applications` y muestra la lista |
| 2 | "Crea una API para un gimnasio" | El agente llama `igniral_generate_schema_from_prompt` y genera la app completa |
| 3 | "Crea una app llamada 'Mi Tienda' con descripción 'API para productos'" | El agente llama `igniral_create_application` con los datos exactos |
| 4 | "Agrega un endpoint /categories al app [ID]" | El agente llama `igniral_create_dynamic_endpoint` |

---

## 7. Casos de Error Esperados

### 7.1. Credenciales inválidas

```bash
# Con un clientSecret incorrecto
IGNIRAL_CLIENT_ID=agent-xxx IGNIRAL_CLIENT_SECRET=wrong \
  IGNIRAL_AUTH_URL=http://localhost:8081 \
  IGNIRAL_API_URL=http://localhost:8082 \
  IGNIRAL_AI_API_URL=http://localhost:8084 \
  npm start
```

Al ejecutar cualquier herramienta: Debe retornar mensaje de error `401` indicando que las credenciales son inválidas.

### 7.2. Key revocada

1. Crear una key y configurarla en el MCP Server
2. Ejecutar `igniral_list_applications` → debe funcionar
3. Desde el Dashboard, revocar la key
4. Ejecutar otra herramienta → debe fallar con `401`

### 7.3. Variables de entorno faltantes

```bash
IGNIRAL_CLIENT_ID=agent-xxx npm start
```

**Resultado esperado:** El servidor debe arrojar inmediatamente:
```
Missing required environment variables: IGNIRAL_CLIENT_SECRET, IGNIRAL_API_URL, IGNIRAL_AI_API_URL.
See .env.example for the expected configuration.
```

### 7.4. Microservicio caído

1. Detener `igniral-microservice-json-elements`
2. Ejecutar `igniral_list_applications`
3. Debe retornar un mensaje de error de conexión (no un crash del MCP Server)

### 7.5. Validación de parámetros

Usar el MCP Inspector para enviar parámetros inválidos:

```json
// Prompt demasiado corto
{ "prompt": "hola" }
// → Error: Prompt must be at least 10 characters

// Endpoint path sin /
{ "applicationId": "xxx", "endpointPath": "products", ... }
// → Error: endpointPath must start with /

// Métodos HTTP inválidos
{ "allowedMethods": ["PATCH"] }
// → Error: Invalid enum value
```

---

## 8. Checklist Final

Marcar cada item como ✅ al verificar:

### Backend (Auth Server)
- [ ] La tabla `agent_api_keys` existe y tiene las columnas correctas
- [ ] Se puede crear un Agent API Key vía API
- [ ] Se puede listar Agent API Keys vía API
- [ ] Se puede revocar un Agent API Key vía API
- [ ] Los límites por suscripción funcionan (FREE=1, STANDARD=3, PRO=5, ENTERPRISE=10)
- [ ] El token generado tiene `sub=userId` (no `sub=clientId`)
- [ ] El token generado tiene `subscription` con el plan real del usuario
- [ ] El token tiene TTL de 2 horas (`expires_in: 7200`)
- [ ] Un token revocado no puede generar nuevos tokens

### Dashboard
- [ ] El link "Agent API Keys" aparece en el sidebar
- [ ] La vista `/settings/agent-keys` carga correctamente
- [ ] Se puede crear una key desde el modal
- [ ] El ClientSecret se muestra solo una vez
- [ ] Se puede revocar una key desde la tabla

### MCP Server
- [ ] El servidor compila sin errores (`npm run build`)
- [ ] El servidor arranca y muestra URLs configuradas en stderr
- [ ] `TokenManager` obtiene tokens automáticamente
- [ ] `igniral_list_applications` funciona
- [ ] `igniral_create_application` funciona
- [ ] `igniral_create_dynamic_endpoint` funciona
- [ ] `igniral_generate_schema_from_prompt` funciona (30-90s)
- [ ] Las validaciones Zod rechazan parámetros inválidos
- [ ] Los errores HTTP se traducen a mensajes instruccionales

### Integración End-to-End
- [ ] Claude Desktop detecta el servidor MCP
- [ ] Cursor detecta el servidor MCP
- [ ] El agente puede listar aplicaciones existentes
- [ ] El agente puede crear aplicaciones nuevas
- [ ] El agente puede generar apps completas desde un prompt

---

> **Nota:** Si todas las pruebas de las Fases 1-4 pasan, la integración end-to-end (Fase 5) debería funcionar sin problemas. Los fallos más comunes son:
> - URLs incorrectas en las variables de entorno
> - Puerto del auth-server diferente al esperado
> - El usuario no tiene suscripción activa (plan `null` → se trata como `FREE`)
> - Falta el header `Host` con el subdominio al consumir APIs directamente con curl
