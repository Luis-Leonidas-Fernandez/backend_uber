const { response } = require('express');
const Driver = require('../models/driver');
const Address = require('../models/ubicacion');
const mongoose = require('mongoose');

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

const finishTravel = async(req = request, res = response) => {   
           
    const  idDriver  = req.body.idDriver;
    const  order     = req.body.order;
    const status   = req.body.status; 

    console.log('[REQ.BODY.IdDriver:]', idDriver);
    console.log('[REQ.BODY.Order:]', order);
    console.log('[REQ.BODY.Status:]', status);
    
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
      
      //console.log('[RESPONSE ADD DRIVER TO BLACK LIST:]', addBlackList);
      // Se actualiza el estado del Conductor en la colecion DRIVER
      const driverStatus = await Driver.findOneAndUpdate(
        {_id: idDriver},
        {$set: { order: order,  status: status}},
        { new: true, runValidators: true } );  
                             
      console.log('[ADDRESS COLLECTION:]', UserAddress);
      console.log('[DRIVER COLLECTION.Status:]', driverStatus);
      
      
      if (!UserAddress){
        return res.status(400).json({
           ok: false,
           msg: 'El conductor no puede ser eliminado'
       });
     }  
       const data = {
           UserAddress,                
       } 
       console.log('[RES.JSON]', data);                
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
    console.log('[REQ.BODY.horaEsperaFin :] ', horaEsperaFin);
    console.log('[REQ.PARAMS.ID ADDRESS :]', id);
  
    try {
      const address = await Address.findById(id);
  
      if (!address) {
        return res.status(404).json({
          ok: false,
          msg: 'No se encontró la orden con ese ID',
        });
      }
      console.log('[ENCONTRO UNA ADDRESS :]');
      address.horaEsperaFin = new Date(horaEsperaFin);
      await address.save();
      console.log('[SE GUARDO ADDRESS ACTUALIZADA CORRECTAMENTE:]');
      return res.json({
        ok: true,
        msg: 'Hora de espera final actualizada correctamente',
        address,
      });
      

    } catch (error) {
      console.error('Error actualizando horaEsperaFin:', error);
      return res.status(500).json({
        ok: false,
        msg: 'Error del servidor',
      });
    }
  };

module.exports = {
    statusUpdate,
    finishTravel,
    locationDriverUpdate,
    statusDriverArrived,
    statusDriverDisconnect,
    updateHoraEsperaFin
      
}

