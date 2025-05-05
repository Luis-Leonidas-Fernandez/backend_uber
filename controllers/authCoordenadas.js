const { response } = require('express');
const { buscarZonaCercanaPost } = require('../middlewares/buscar-zona');
const Address=  require('../models/ubicacion');
const Usuario = require('../models/usuario');
const Driver = require('../models/driver');

const postUbicacion = async(req, res = response) => {

   
    const { miId, estado, ubicacion, destino ,distanciaKm, precio } = req.body;   
  
    try {

        const usuarioDb    = await Usuario.findOne({miId});
     
        if (!usuarioDb) {
            return res.status(404).json({
                ok: false,
                msg: 'la Ubicacion no puede ser registrada'
            });
        }
       
        
        const imput = {
            miId: miId,
            estado: estado,            
            ubicacion: {type: "Point", coordinates: ubicacion},
            destino: {type: "Point", coordinates: destino},
            distanciaKm: distanciaKm,
            precio: precio,
            mensaje:   [{ type: "Point",coordinates: [-58.984374,-27.451225]}]
          
            
        }        
       
        const dist = await buscarZonaCercanaPost(ubicacion);      
      
       
        if(dist <= 2000){           
            
            
            const address = new Address(imput);  
            const result = await address.save();

     
            const coords = result.mensaje[0].coordinates;
            
            const points =  coords;            
            const types = result.mensaje[0].type;
            


            const data = {
                id: result._id,
                miId: result.miId,
                estado: result.estado,
                ubicacion: result.ubicacion,
                distanciaKm: result.distanciaKm,
                precio: result.precio,
                mensaje: [{ type: types, coordinates: points}],
                createdAt: result.createdAt,
                updatedAt: result.updatedAt
            }

         
            
            return res.status(200).json({data});

        } else{
            
            const data = {
                id: null,
                miId: null
            }
           
            return res.status(200).json({ data});;
        }

        

    } catch (error) {
      
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
}

const removeAddress = async (req = request, res = response) => {
    const { order, miId, precioTotal } = req.body;
  
    try {
      // 🧩 Actualizamos el documento del usuario: eliminamos campos, y agregamos otros
      const UserAddress = await Address.findOneAndUpdate(
        { miId: miId },
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
  
      const idDriver = UserAddress.idDriver;
  
    
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
  

const finishTravelUser = async(req, res = response) => {

    
    const  idDriver  = req.body.idDriver;
    const  order     = req.body.order; 
 
     try {
 
        const UserAddress = await Address.findOneAndUpdate({idDriver: idDriver},{ $unset: { idDriver: "" }} );
                            await Driver.findOneAndUpdate({_id: idDriver}, {$set: { order: order,  upsert: true }} );                       
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
 



const getUbicaciones = async(req, res = response) => {
    
    try {

        const addresses = await Address.find({ $and: [{ _id: { $ne: req._id }}, {estado: true}]})
        .sort({createdAt: 'asc'})
        
        if (!addresses) {
            return res.status(404).json({
                ok: false,
                msg: 'las ordenes no puede ser halladas'
            });
        }       
        

        res.json({            
            
            addresses

        });

    } catch (error) {
        
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
}

const getUbicacionesAutomatic = async(res= response ) => {
    
        const idAdmin = '6439d6398dbdb6d5224e0bd6';
        const idOrderNull =  [{miId: "1"}];
    try {

        const data = await Address.find({ $and: [{ _id: { $ne: idAdmin }}, {estado: true}]})
        .sort({createdAt: 'asc'})
        .limit(20)       
        
         const obj = await comprobarNull(data);        
        
         if (obj === null) {           
        
            return idOrderNull ;
        } else {
            return obj;
        }      
        
        

    } catch (error) {
       
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
}

const comprobarNull = async (resultado) => {

    let result = [];
    const idOrderNull =  [{miId: "1"}];    
    let len = resultado.length;

    if(len !== 0){

    for(let i= 0; i < len; i++){

        if(resultado[i].length !== 0 ){

            const obj = resultado[i];            
            result.push(obj)
            
        }
        
    } 
    return result;
} else{
    return idOrderNull;
}
    
    
}


module.exports = {
    postUbicacion,
    getUbicaciones,
    finishTravelUser,
    removeAddress,
    getUbicacionesAutomatic
}

