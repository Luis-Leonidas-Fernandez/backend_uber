# 🛡️ Implementación de Rate Limiting - Protección contra Fuerza Bruta

## ✅ **IMPLEMENTACIÓN COMPLETADA**

He implementado un sistema robusto de **Rate Limiting** para proteger todos los endpoints de autenticación contra ataques de fuerza bruta.

## 📦 **DEPENDENCIA AGREGADA**

```bash
npm install express-rate-limit
```

## 🔧 **ARCHIVOS MODIFICADOS**

### 1. **Nuevo Middleware**: `middlewares/rateLimiter.js`
- ✅ Rate limiting específico para usuarios normales (5 intentos/15 min)
- ✅ Rate limiting más estricto para administradores (3 intentos/15 min)
- ✅ Rate limiting para registros (10 intentos/hora)
- ✅ Sistema de logging de intentos de login
- ✅ Detección de actividad sospechosa

### 2. **Rutas Protegidas**:

#### `/api/login` (routes/auth.js)
- ✅ Rate limiting en endpoint de login
- ✅ Rate limiting en endpoint de registro
- ✅ Logging de intentos
- ✅ Detección de patrones sospechosos

#### `/api/loginadmin` (routes/authAdmin.js)
- ✅ Rate limiting más estricto para admin
- ✅ Rate limiting en registro de admin
- ✅ Logging especializado para admins

#### `/api/logindriver` (routes/authDriver.js)
- ✅ Rate limiting en login de drivers
- ✅ Rate limiting en registro de drivers
- ✅ Logging de intentos de drivers

## 🚨 **PROTECCIONES IMPLEMENTADAS**

### **Rate Limiting por Rol**:
- **Usuarios normales**: 5 intentos cada 15 minutos
- **Administradores**: 3 intentos cada 15 minutos (más estricto)
- **Registros**: 10 intentos cada hora

### **Logging de Seguridad**:
- ✅ Registro de todos los intentos de login
- ✅ Captura de IP, email, User-Agent y timestamp
- ✅ Detección de User-Agents sospechosos
- ✅ Alertas por emails obviamente falsos

### **Respuestas de Error**:
```json
{
    "ok": false,
    "msg": "Demasiados intentos de login desde esta IP, intenta de nuevo en 15 minutos",
    "retryAfter": 900
}
```

## 🔄 **CÓMO FUNCIONA**

1. **Primera línea de defensa**: Rate limiting por IP
2. **Segunda línea**: Logging detallado de intentos
3. **Tercera línea**: Detección de patrones sospechosos
4. **Cuarta línea**: Respuestas informativas con tiempo de espera

## 🧪 **PRUEBAS RECOMENDADAS**

### Para probar el rate limiting:

```bash
# Intentar múltiples logins rápidos desde la misma IP
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}'
done
```

### Resultado esperado:
- Los primeros 5 intentos fallarán con error de credenciales
- El 6to intento fallará con error de rate limiting (429)
- Mensaje: "Demasiados intentos de login desde esta IP, intenta de nuevo en 15 minutos"

## 📊 **MONITOREO**

### Logs que verás en consola:
```
[2024-01-15T10:30:00.000Z] Login attempt - IP: 192.168.1.100, Email: test@test.com, User-Agent: Mozilla/5.0...
[SUSPICIOUS] Login attempt with unusual User-Agent from IP: 192.168.1.100
[SUSPICIOUS] Login attempt with suspicious email: admin@admin from IP: 192.168.1.100
```

## ⚡ **INSTALACIÓN Y USO**

1. **Instalar dependencia**:
```bash
npm install express-rate-limit
```

2. **Reiniciar el servidor**:
```bash
npm run start:dev
```

3. **Verificar funcionamiento**:
- Hacer 6 intentos de login fallidos rápidamente
- Debería recibir error 429 en el 6to intento

## 🎯 **BENEFICIOS INMEDIATOS**

- ✅ **Protección total** contra ataques de fuerza bruta
- ✅ **Diferentes niveles** de seguridad por rol
- ✅ **Monitoreo completo** de intentos de acceso
- ✅ **Detección temprana** de actividad sospechosa
- ✅ **Respuestas claras** con tiempos de espera

## 🔮 **PRÓXIMOS PASOS RECOMENDADOS**

1. **Sistema de bloqueo de cuentas** (después de X intentos fallidos)
2. **Validación robusta de contraseñas**
3. **CAPTCHA después de fallos**
4. **Dashboard de seguridad**

---

**¡Tu API ahora está protegida contra ataques de fuerza bruta! 🛡️**
