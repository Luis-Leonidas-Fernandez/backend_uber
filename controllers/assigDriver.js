const { response } = require('express');
const Address      = require('../models/ubicacion');
const Driver       = require('../models/driver');
const { buscarZonaCercana } = require('../middlewares/buscar-zona');
const { updateStatusDriverAsing  } = require('../middlewares/drivers-to-base');
const { addDriverToAddress, } = require('../middlewares/address');
const {findBasesByIdsAndDrivers} = require('../middlewares/buscar-base');


const assigDriver = async(req = request, res = response) => {          
   
    const  miId = req.body.miId;   
   
    try {

        const drivers = await Driver.find({ $and: [{ _id: { $ne: miId }}, {online: true},{order: 'libre'}]})
        .sort({online: 'desc', order: -1, viajes: 1})        
        .limit(20)
        
        

        const driver = drivers[0];        
        const result = driver._id; 
        const idDriver = result.toString();
       

       const UserAddress = await Address.findOneAndUpdate({miId: miId}, {$set: { idDriver: idDriver, estado: false }}, { new: true });                       
        if (!UserAddress){
         return res.status(400).json({
            ok: false,
            msg: 'El conductor no puede ser registrado'
        });
      }  
        const data = {
            UserAddress,                
        } 
                        
        res.json({
            data
        });
    
        } catch (error) {
           
            res.status(500).json({
                ok: false,
                msg: 'Hable con el administrador'
            });
    }
          
}

const assigDriverAutomatic = async( req = request, res = response ) => {          
   
    const  miId = req.params._id;
    const ubicacion = req.body;    
    
    const  noDisponible = 'no disponible';   
    const  driversNotAvailable = 'Conductores no disponibles';

    try {

        
        //Busca Zona mas Cercana - Extrae idBase y Distancia de las bases
         
        const zona = await buscarZonaCercana(ubicacion);       
        
        const idBase    = zona.basesIds;
        const distancia = zona.dist;        
        console.log('id base', idBase);
        console.log('distancia', distancia);

         if(distancia > 3000) {   
         
          return res.json({
            ok: false,
            driversNotAvailable,
            miId
          })

        }
        
        // **** BUSCA TODAS LAS BASES DE UNA DETERMINADA ZONA MAS SUS CONDUCTORES *****
        const driverList = await findBasesByIdsAndDrivers(idBase);
        
        if (driverList.length === 0) {
            return res.json({ ok: false, driversNotAvailable, miId });
        }
        
        // 🧠 Traer address actual del usuario para revisar la blacklist
        const userAddress = await Address.findOne({ miId });

        if (!userAddress) {
         return res.json({ ok: false, msg: 'No se encontró la dirección del usuario' });
        }

        const blacklist = userAddress.blackList.map(driver => driver.toString());
        
        // 🔁 Buscar conductor que NO esté en blacklist
        let assignedDriver = null;

        for (const item of driverList) {
        const idDriver = item.drivers._id.toString();

        if (!blacklist.includes(idDriver)) {
        assignedDriver = idDriver;
        break;
        }
       }
        
        if (!assignedDriver) {
        return res.json({ ok: false, driversNotAvailable, miId });
        }
        
        console.log('[assignedDriver value:]', assignedDriver);
        
         // ✅ Asignar conductor a la Address
         const addressUpdated = await addDriverToAddress(miId, assignedDriver);

         if (!addressUpdated) {
         return res.json({ ok: false, driversNotAvailable, miId });

        }

        //Actualiza el estdod del coductor a en-camino
        await updateStatusDriverAsing(assignedDriver, noDisponible);
              
        
        const data = { addressUpdated }  

        return res.json({ok: true , data});
        
                          
        
    } catch (error) {
           
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    } 
          
}




const removeDriver = async(req = request, res = response) => {   
           
     const { idDriver } = req.body.idDriver;    
        
    try {
        
       const UserAddress = await Address.findOneAndUpdate({idDriver: idDriver},{$unset: { idDriver: ""}} );
                                               
        if (!UserAddress){
         return res.status(400).json({
            ok: false,
            msg: 'El conductor no puede ser eliminado'
        });
      }  
        const data = {
            UserAddress,                
        } 
                        
        res.json({
            data
        });
    
        } catch (error) {
           
            res.status(500).json({
                ok: false,
                msg: 'Hable con el administrador'
            });
    }
          
}



module.exports ={
    assigDriver,
    removeDriver,
    assigDriverAutomatic,
    
    
}

