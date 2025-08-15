const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const {dispatchDrivers}  = require('./service/dispatch_server');

const {getPrice}        = require('./Generators/price');
const { createVauchers}  = require('./service/cupon_server');
const { createPrice}    = require('./service/price_server');
const { createInvoiceJob, createInvoicePdfJob }    = require('./service/invoice_server');

const cron     = require("node-cron");


// DB Config
require('./database/config').dbConnection();


// App de Express
const app = express();

// Lectura y parseo del Body
app.use(express.json());

//Cors
app.use(cors());


// Node Server
const server = require('http').createServer(app);
module.exports.io = require('socket.io')(server);

require('./sockets/socket.js');


// Path público
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

// Path de acceso a fotos
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));


// Mis Rutas Usuarios
app.use('/api/login', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/ubicaciones', require('./routes/ubicaciones'));


// Mis Rutas Drivers
app.use('/api/logindriver', require('./routes/authDriver'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/status', require('./routes/estadoViajes'));
app.use('/api/location', require('./routes/locationDriver'));
app.use('/api/travel-history', require('./routes/travelHistory'));


// Mis Rutas Admin
app.use('/api/loginadmin', require('./routes/authAdmin'));
app.use('/api/base', require('./routes/base'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/travel', require('./routes/bookingDriver'));


// Obtener viajes desde distintos roles
app.use('/api/viajes', require('./routes/viajes'));

// Asignar vaucher
app.use('/api/cupon', require('./routes/cupon'));

//Asignar Factura
app.use('/api/invoice', require('./routes/invoice'));



server.listen(process.env.PORT, (err) => {

    if (err) throw new Error(err);    

});

//servicio de despacho de ordenes

 cron.schedule("*/1 * * * *", async function () {
    
    await dispatchDrivers();              
    
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
}); 


cron.schedule("* */22 * * *", async function () {  
         
   //GUARDA EN STORAGE EL PRECIO DEL DOLAR BLUE
  
  await getPrice();
   
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});


//servicio de despacho de vauchers cada 24 hs horario: 00:00 /"0 0 * * *"

cron.schedule("* */23 * * *", async function ()  { 
     
     //CREA UN VAUCHER RANDOM 01FG-25SD-3528-ADF25

   await createVauchers();
    
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});


cron.schedule("0 0 * * *", async function () {    
     
    // GUARDA EN COLLECTION USUARIO EL PRECIO DEL VAUCHER

    await createPrice();
  
  
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

cron.schedule("* * 25 * *", async function () {    
     
     //GUARDA EN COLLECTION INVOICE LA FACTURA MENSUAL A COBRAR

    await createInvoiceJob();
  
   
},{
   scheduled: true,
   timezone: "America/Argentina/Buenos_Aires"
});


cron.schedule("* * 26 * *", async function () {    
     
    //GUARDA PDF FACTURA EN DIRECTORIO 

   await createInvoicePdfJob();
 
  
},{
  scheduled: true,
  timezone: "America/Argentina/Buenos_Aires"
});
