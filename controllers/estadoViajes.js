const { response } = require('express');
const Driver = require('../models/driver');
const Address = require('../models/ubicacion');
const Base = require('../models/base');
const mongoose = require('mongoose');
const TravelHistory = require('../models/history');

const statusDriverDisconnect = async(req = request, res = response) => {          
   
      
    const {_id, online }= req.body;    
    
   try {
      
      const driverStatus = await Driver.findOneAndUpdate({_id: _id}, {$set: { online: online }});
                                              
       if (!driverStatus){
        return res.status(400).json({
           ok: false,
           msg: 'El conductor no puede actualizar el estado del viaje'
       });
     }  
       const data = {
           driverStatus,
                          
       } 
                       
       res.json({
           driverStatus,
           
       });
   
       } catch (error) {
          
           res.status(500).json({
               ok: false,
               msg: 'Hable con el administrador'
           });
   }
         
}

const statusDriverArrived = async(req = request, res = response) => {          
   
      
    const {_id, status }= req.body;    
    
   try {
      
      const driverStatus = await Driver.findOneAndUpdate({_id: _id}, {$set: { order: status }});
      await Address.findOneAndUpdate({idDriver: _id}, {$set: {horaEsperaInicio: new Date()}});
                                              
       if (!driverStatus){
        return res.status(400).json({
           ok: false,
           msg: 'El conductor no puede actualizar el estado del viaje'
       });
     }  
       const data = {
           driverStatus,
                          
       } 
                       
       res.json({
           driverStatus,
           
       });
   
       } catch (error) {
          
           res.status(500).json({
               ok: false,
               msg: 'Hable con el administrador'
           });
   }
         
}

const locationDriverUpdate = async(req = request, res = response) => {          
   
      
    const { mensaje, idDriver, idOrder,  } = req.body;
    const positionDriver = JSON.parse(mensaje);        
    const point = (positionDriver.coordinates).reverse();    

   
   try {
      
    const driverLocation = await Address.findOneAndUpdate({_id: idOrder}, 

        {$addToSet: {
            mensaje: {coordinates: point}
        }});   
                                              
       if (!driverLocation){
        return res.status(400).json({
           ok: false,
           msg: 'la ubicacion del conductor no se puede actualizar'
       });
     }  
       const data = {
           driverLocation,
                          
       } 
                       
       res.json({
           driverLocation,
           
       });
   
       } catch (error) {
         
           res.status(500).json({
               ok: false,
               msg: 'Hable con el administrador'
           });
   }
         
}


const statusUpdate = async(req = request, res = response) => {          
   
      
     const { _id, order, viajes }= req.body;    
     
    try {
       
       const driverStatus = await Driver.findByIdAndUpdate({_id: _id}, {$set: { order: order }, $inc: { viajes: viajes}}, { upsert: true });
                                               
        if (!driverStatus){
         return res.status(400).json({
            ok: false,
            msg: 'El conductor no puede actualizar el estado del viaje'
        });
      }  
        const data = {
            driverStatus,
                           
        } 
                        
        res.json({
            driverStatus,
            
        });
    
        } catch (error) {
           
            res.status(500).json({
                ok: false,
                msg: 'Hable con el administrador'
            });
    }
          
}


const removeAddress = async (req = request, res = response) => {
    const { order, idDriver, precioTotal } = req.body;
   
  
    try {

      // ✅ guardamos la address en la coleccion TravelHistoy 
      await saveAddressInTravelHistory(idDriver, precioTotal);

      
      // 🧩 Actualizamos el documento de la orderr: eliminamos campos, y agregamos otros
      const UserAddress = await Address.findOneAndUpdate(
        { idDriver: idDriver },
        {
          $unset: { miId: "", estado: "" },
          $set: {
            precioTotal: precioTotal,
            finalizado: true,
          }
        },
        { new: true } // ← para obtener el documento actualizado
      );
  
      if (!UserAddress) {
        return res.status(400).json({
          ok: false,
          msg: 'El pedido no puede ser cancelado'
        });
      }
  
      
    
      await Address.findOneAndUpdate(
        { idDriver: idDriver },
        { $unset: { idDriver: "" } }
      );
  
      // ✅ Liberamos al conductor
      await Driver.findOneAndUpdate(
        { _id: idDriver },
        {
          $set: {
            order: order,
            status: 'disponible'
          },
          $upsert: true
        }
      );


      //🚀 sumamos 1 address al campo viajes en la base correspondiente
      await saveAddresInBases(idDriver);
     
      res.json({
        data: UserAddress
      });
  
    } catch (error) {
      
      res.status(500).json({
        ok: false,
        msg: 'Hable con el administrador'
      });
    }
  };


  const saveAddressInTravelHistory = async (idDriver, precioTotal) => {

    try {
      // Buscar el documento Address
      const address = await Address.findOne({idDriver: idDriver});
     
      if (!address) {
          throw new Error('Dirección no encontrada');
      }

      // Crear un nuevo documento para TravelHistory
      const nuevoHistorial = new TravelHistory({
          driverId: address.idDriver,
          ubicacion: {
              type: 'Point',
              coordinates: address.ubicacion.coordinates
          },
          destino: {
              type: 'Point',
              coordinates: address.destino?.coordinates || []  // si tienes campo destino
          },
          distancia: parseFloat(address.distanciaKm.toFixed(2)),  // si existe en Address
          precio: precioTotal,        // si existe en Address
          finalizado: true,
          createdAt: address.createdAt,
          updatedAt: address.updatedAt
      });

      const saved = await nuevoHistorial.save();
     
      return saved;

  } catch (error) {
    
      throw error;
  }
  };


  const saveAddresInBases = async (idDriver) => {   
               

    try {

      const driver =  await Driver.findById({_id: idDriver});

      if (!driver) {
        throw new Error('Conductor no encontrado');
      }

      const idBase  =  driver.base;
      
      const base = await Base.findOneAndUpdate({ 

        _id: idBase }, // 🎯 busca la base donde el conducto esta suscripto
        { $inc: { viajes: 1 } },           // ➕ suma 1 al campo "viajes"
        { new: true }                      // 🆕 devuelve el documento actualizado);
      ); 

     
      if (!base){
        throw new Error('Base no encontrada');
     }  
  
    
      return base;
    } catch (error) {
    
      throw error;
  }
}     
     
      
     
         


const cancelTravel = async(req = request, res = response) => {   
           
    const  idDriver  = req.body.idDriver;
    const  order     = req.body.order;
    const status   = req.body.status; 

    
   try {

      // El conductor cancela el viaje 
      // Se agrega el ID del conductor a una black list para no volver a asignarle el mismo viaje
      const UserAddress = await Address.findOneAndUpdate(
        { idDriver: idDriver },
        {
          $set: { estado: true , horaEsperaInicio: null},
          $unset: { idDriver: "" },
          $addToSet: { blackList: idDriver } // evita duplicados
        },
        { new: true }
      );
      
    
      // Se actualiza el estado del Conductor en la colecion DRIVER
      const driverStatus = await Driver.findOneAndUpdate(
        {_id: idDriver},
        {$set: { order: order,  status: status}},
        { new: true, runValidators: true } );  
                             

      
      
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

const updateHoraEsperaFin = async (req = request, res = response) => {

    const id = req.params._id;
    //const idObject = new ObjectId(id);
    const { horaEsperaFin } = req.body;

  
    try {
      const address = await Address.findById(id);
  
      if (!address) {
        return res.status(404).json({
          ok: false,
          msg: 'No se encontró la orden con ese ID',
        });
      }
 
      address.horaEsperaFin = new Date(horaEsperaFin);
      await address.save();
     
      return res.json({
        ok: true,
        msg: 'Hora de espera final actualizada correctamente',
        address,
      });
      

    } catch (error) {
     
      return res.status(500).json({
        ok: false,
        msg: 'Error del servidor',
      });
    }
  };


  



module.exports = {
    statusUpdate,
    cancelTravel,
    locationDriverUpdate,
    statusDriverArrived,
    statusDriverDisconnect,
    updateHoraEsperaFin,
    removeAddress,
    saveAddresInBases
      
}

