const Address = require('../models/ubicacion');
const ObjectId = require('mongodb').ObjectId;


const obtenerViajeDriver = async ( req, res = response ) => {

   const id = req.params._id.trim();
   const idObject = new ObjectId(id);
   
   const address = await Address.aggregate([

            {
                $match : {$and: [{idDriver: idObject}, {estado: false}] }},
            
            {
                $lookup:
                {
                    from: "usuarios",
                    localField: "miId",//address
                    foreignField: "_id",//usuario
                    as: "user"
                }
            },            
            {
                $replaceRoot: {newRoot: {$mergeObjects: [{$arrayElemAt: ['$user', 0]}, "$$ROOT"]}}
            },
            {
                $lookup: {
                  from: "drivers",
                  localField: "idDriver",
                  foreignField: "_id",
                  as: "driver"
                }
              },
              {
                $replaceRoot: {
                  newRoot: {
                    $mergeObjects: [ { $arrayElemAt: ["$driver", 0] }, "$$ROOT" ]}}
              },
                     
              {$project: { 
                    _id: 1,
                    nombre: 1,
                    email: 1,
                    online: 1,
                    estado: 1,
                    order: 1,
                    cupon: 1,
                    ubicacion: 1,
                    destino: 1,
                    distanciaKm: 1,                    
                    precio: 1,
                    horaEsperaInicio: 1,
                    horaEsperaFin: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    idDriver: 1,
                    finalizado: { $ifNull: ["$finalizado", false] }                                   
                   
                }},                       
           
    ]);       
  
    const orderUser = Object.assign({}, ...address); // data convertida a objeto    
    

    const order = Object.keys(orderUser).length; // data convertida a array lenght
   

    const data = order ?? null;
    

    if(order !== 0) {      
                    
                
        return res.status(200).json({ orderUser});

    }else {    
       
        const emptyObject = {
            idDriver: '0',
            ok: false,
            msg: 'Address no encontrada'
        }
        
        return res.status(201).json({ emptyObject});
    }
    
}

module.exports ={
    obtenerViajeDriver
   
}

