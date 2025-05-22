const { response } = require('express');
const Address      = require('../models/ubicacion');
const Driver       = require('../models/driver');
const Base = require('../models/base');
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
    let assignedDriver = null;
    try {

    console.log('🔧 Iniciando asignación de conductor...');
    console.log('🧾 Datos recibidos:', { miId, ubicacion });        
        //Busca Zona mas Cercana - Extrae idBase y Distancia de las bases
         
        const zona = await buscarZonaCercana(ubicacion);       
        console.log('📍 Zona más cercana encontrada:', zona);         
        const idBase    = zona.basesIds;
        const distancia = zona.dist;
        const baseSelected   =  await Base.findOne({_id: idBase});
       console.log('📦 Base seleccionada:', baseSelected); 
        const baseLocation = baseSelected.ubicacion.coordinates;  



         if(distancia > 3000) {   
         console.log('🚫 Zona muy alejada, sin conductores asignables (distancia > 3000):', distancia); 
          return res.json({
            ok: false,
            driversNotAvailable,
            miId
          })

        }
      

        // **** BUSCA TODAS LAS BASES DE UNA DETERMINADA ZONA MAS SUS CONDUCTORES *****
        const driverList = await findBasesByIdsAndDrivers(idBase);
       console.log('🔎 Conductores encontrados en la zona:', driverList.length);

        if (driverList.length === 0) {
           console.log('🚫 No hay conductores disponibles en las bases.'); 
            return res.json({ ok: false, driversNotAvailable, miId });

        }

      
        // 🧠 Traer address actual del usuario para revisar la blacklist
        const userAddress = await Address.findOne({ miId });
       console.log('📬 Dirección actual del usuario:', userAddress);
        if (!userAddress) {
         console.log('🚫 No se encontró la dirección del usuario.');
         return res.json({ ok: false, msg: 'No se encontró la dirección del usuario' });
        }

        const blacklist = userAddress.blackList.map(driver => driver.toString());
        console.log('🛑 Lista negra del usuario:', blacklist);
        // 🔁 Buscar conductor que NO esté en blacklist
        

        for (const item of driverList) {
        const idDriver = item.drivers._id.toString();

        if (!blacklist.includes(idDriver)) {
        assignedDriver = idDriver;
        console.log('✅ Conductor asignado:', assignedDriver);
        break;
        }
       }
        
        if (!assignedDriver) {
       console.log('🚫 Todos los conductores están en la blacklist.');
        return res.json({ ok: false, driversNotAvailable, miId });
        }
        
        
         // ✅ Asignar conductor a la Address
         const addressUpdated = await addDriverToAddress(miId, assignedDriver,baseLocation);
         console.log('📍 Resultado de actualizar Address:', addressUpdated);
         if (!addressUpdated) {
        console.log('⚠️ No se pudo actualizar la dirección. Conductores disponibles:', driversNotAvailable);
         return res.json({ ok: false, driversNotAvailable, miId });

        }

        //Actualiza el estdod del coductor a en-camino
        await updateStatusDriverAsing(assignedDriver, noDisponible);
        console.log('✅ Estado del conductor actualizado a "en-camino":', assignedDriver);      
        
        const data = { addressUpdated }  
       console.log('🎯 Finalización exitosa del proceso de asignación:', data); 

        return res.json({ok: true , data});
        
                          
        
    } catch (error) {
       console.error('❌ Error en asignación de conductor:', error);    
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

