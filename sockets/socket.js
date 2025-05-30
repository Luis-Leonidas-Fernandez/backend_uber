const { io } = require('../index');
const { comprobarJWT } = require('../helpers/jwt');
const { driverConectado, driverDesconectado } = require('../controllers/socket');
const { grabarLocation } = require('../controllers/location');

// Coneccion de Sockets
io.on('connection', async (client) => {

   
    const token = client.handshake.headers['x-token']; 
    const [valido, uid] = comprobarJWT(token);
      

    // Verificar autenticación
    if (!valido) {     
     return client.disconnect(); }

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
