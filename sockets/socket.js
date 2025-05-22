const { io } = require('../index');
const { comprobarJWT } = require('../helpers/jwt');
const { driverConectado, driverDesconectado } = require('../controllers/socket');
const { grabarLocation } = require('../controllers/location');
// Mensajes de Sockets
io.on('connection', async (client) => {

   
    const token = client.handshake.headers['x-token']; // 🔹 DEBE estar antes de usarla
    const [valido, uid] = comprobarJWT(token);
    
    console.log('🔌 Conexión entrante...');
    console.log('🧾 Token:', token);
    console.log('✅ UID decodificado:', uid);  

    // Verificar autenticación
    if (!valido) { 
    console.log('❌ Token inválido o UID indefinido. Desconectando cliente.'); 
     return client.disconnect(); }


    // Driver autenticado
    client.join(uid);
    await driverConectado(uid);

    
    // Escuchar la ubicacion del driver
    
    client.on('driver-location', async(payload) => {
      
        
        const location = [];

        location.push(payload);
        

        if (location.length > 0) {
            const ok = await grabarLocation(location[0]);
            
        } 
        
                                
               

    });
   


client.on('disconnect', async () => {
    try {
        console.log('🔌 Cliente desconectado:', uid);
        const result = await driverDesconectado(uid);
        console.log('🟢 Estado actualizado:', result);
    } catch (err) {
        console.error('❌ Error al desconectar al conductor:', err);
    }
});

   
});
