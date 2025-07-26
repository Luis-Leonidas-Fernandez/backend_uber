# 🚖 Backend de InriApp (App tipo Uber para Remiserías)

Este es el backend de **InriApp**, una plataforma de transporte estilo Uber, desarrollada con **Node.js**, **Express**, **MongoDB** y **Socket.IO**. Permite gestionar viajes en tiempo real, calcular precios por distancia y espera, y conectar usuarios con conductores.

## 🧱 Tecnologías utilizadas

- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.IO
- JSON Web Tokens (JWT)
- BcryptJS
- CORS
- dotenv

## 📁 Estructura del proyecto

```
📦 backend
┣ 📂controllers
┣ 📂middlewares
┣ 📂models
┣ 📂routes
┣ 📂services
┣ 📂sockets
┣ 📜index.js
┣ 📜.env.example
┣ 📜README.md
┗ 📜LICENSE
```

## 🔧 Configuración inicial

1. Clona el repositorio:

```bash
git clone https://github.com/tuusuario/inriapp-backend.git
cd inriapp-backend
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env` basado en `.env.example` y completa tus variables:

```env
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=tu_clave_secreta
```

4. Ejecuta el proyecto en modo desarrollo:

```bash
npm run start:dev
```

## 🚀 Endpoints principales

| Método | Ruta                              | Descripción                         |
|--------|-----------------------------------|-------------------------------------|
| POST   | `/api/auth/login`                 | Login de usuario                    |
| GET    | `/api/drivers/:id`                | Obtener conductor                   |
| POST   | `/api/travels`                    | Crear nuevo viaje                   |
| GET    | `/api/travels/:driverId`          | Historial de viajes por conductor   |
| POST   | `/api/address/finalizar/:id`      | Finalizar viaje del usuario         |

## 💬 Socket.IO

Este backend utiliza Socket.IO para comunicación en tiempo real:

- 🔄 Enviar ubicación en tiempo real del conductor.
- 🚗 Asignar viajes dinámicamente.
- 📢 Notificar cambios de estado al usuario.

## 👥 Autor

**Luis Leonidas Fernández** – Desarrollador Fullstack  
🔗 [GitHub](https://github.com/Luis-Leonidas-Fernandez)
