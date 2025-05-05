const { redondearNumber } = require('../helpers/redondear');
const Base = require('../models/base');
const mongoose = require('mongoose');


const buscarBases = async (ubicacion ) =>  {      
   
        
        // validar si existen bases
        const bases= await Base.find(); 
            
        if ( !bases ) return 3000;
        
        // buscar las bases mas cercanas
        const base = await buscarBaseCercana(ubicacion);
        
        // elije la base mas cercana y redondea la distancia
        const dist = redondearNumber(base);
       
       
        return dist;
    
}



const buscarBaseCercana = async(ubicacion) => {

    const latUser = ubicacion[0];
    const longUser  = ubicacion[1];
   
    try {

       const base = await Base.aggregate([
            {
              $geoNear: {
                 near: { type: "Point", coordinates: [ longUser, latUser] },
                 distanceField: "dist.calculated",
                 maxDistance: 5000,                 
                 includeLocs: "dist.location",
                 spherical: true
              }
            }
         ]) 

         return base;
        
    } catch (error) {


        const distancia = [];
        return distancia;
        
    }
}

//Busca Todas las Bases de una Zona : que coincidan con Ids ingresados con todos sus conductores
//idBase es un array de ids de bases
 const findBasesByIdsAndDrivers = async (idBase) => {
    
    try {
         
        let objectIdArray;

        if(Array.isArray(idBase)){
         
            objectIdArray = idBase;
        } else {
            objectIdArray = [idBase]
        }

      
        // Convertir los IDs de la variable a ObjectId
        const baseIds = objectIdArray.map(id => 
            mongoose.Types.ObjectId.isValid(id) && !(id instanceof mongoose.Types.ObjectId)
              ? new mongoose.Types.ObjectId(id)
              : id
          );
            
       
        const bases = await Base.aggregate([
            {
                $match: {_id: { $in:  baseIds} }
            },           
            {
                $lookup:
                {
                    from: "drivers",
                    localField: "idDriver",//base
                    foreignField: "_id",//drivers
                    as: "driver",
                    pipeline: [

                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        
                                        { $eq: ["$online", true] },
                                        { $eq: ["$status", "disponible"] },
                                        { $eq: ["$order", "libre"] }
                                    ]
                                }
                            }
                        },
                        {
                         $sort: {viajes: 1}
                        },
                        { $project: { _id: 1, online: 1, order: 1, status: 1, viajes: 1} } //filtra el lookup
                    ],
                }
            },

            {
                $group: {                
                                                
                  _id: "$_id",           
                  drivers: {
          
                    $push: "$driver",
                  
                  },           
                  
                }
              },   
              {
                $unwind: "$drivers"
              },
               {
                $unwind: "$drivers"
              }, 
           
            
        ]);
        
        return bases;
        
    } catch (error) {

        return error;
        
    } 


 
   } 




module.exports ={
    buscarBases,
    findBasesByIdsAndDrivers
}
