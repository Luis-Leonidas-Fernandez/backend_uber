const { io } = require('../index');
const { comprobarJWT } = require('../helpers/jwt');
const { driverConectado, driverDesconectado } = require('../controllers/socket');
const { grabarLocation } = require('../controllers/location');
const Driver = require( '../models/driver');

// Coneccion de Sockets
io.on('connection', async (client) => {

   
    const token = client.handshake.headers['x-token']; 
    const [valido, uid] = comprobarJWT(token);
    console.log('🧪 Socket conectado con token:', token);
    console.log('✅ Token válido:', valido, 'UID:', uid);  

    // Verificar autenticación
    if (!valido) {
        console.log('⛔ Token inválido. Desconectando...');        
     return client.disconnect(); }

    //Verificar que existe en el documento del conductor el campo online (habilitado para trabajar)
    
    const driver = await Driver.findById(uid);

    if (!driver) {
        console.log('⛔ Conductor no encontrado:', uid);
        return client.disconnect();
    }

    // ⛔ Verificar si el campo 'online' existe y es true
    if (typeof driver.online === 'undefined' || driver.online !== true) {
    console.log('⛔ El conductor no está habilitado (campo online no existe o no es true):', uid);
    return client.disconnect();
    }

     client.uid = uid;

    // Driver autenticado
    io.in(uid).socketsLeave(uid);
    client.join(uid);
    await driverConectado(uid, io);

    
    // Escuchar la ubicacion del driver    
    client.on('driver-location', async(payload) => {      
        
        const location = [];

        location.push(payload);        

        if (location.length > 0) {
        await grabarLocation(location[0]);            
        }      
              
    });
   


client.on('disconnect', async () => {
    try {
        const uid = client.uid;         
        await driverDesconectado(uid);

     } catch (err) {
         return err;
     }
});

   
});
