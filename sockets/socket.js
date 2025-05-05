const { io } = require('../index');
const { comprobarJWT } = require('../helpers/jwt');
const { driverConectado, driverDesconectado } = require('../controllers/socket');
const { grabarLocation } = require('../controllers/location');
// Mensajes de Sockets
io.on('connection', (client) => {

    const [valido, uid] = comprobarJWT(client.handshake.headers['x-token'])

  

    // Verificar autenticación
    if (!valido) { return client.disconnect(); }


    // Driver autenticado
    driverConectado(uid);

    client.join(uid);

    // Escuchar la ubicacion del driver
    
    client.on('driver-location', async(payload) => {
      
        
        const location = [];

        location.push(payload);
        

        if (location.length > 0) {
            const ok = await grabarLocation(location[0]);
            
        } 
        
                                
               

    });
   


    client.on('disconnect', () => {       
        driverDesconectado(uid);     
    });
   
});
