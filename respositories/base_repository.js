const Base = require('../models/base');

class BaseRepository {

  
  //Busca una Base y sus conductores
  async findByIdAndDrivers(adminId, idBase) {
    
    const result = await Base.aggregate([

        {
            $match : {$and: [{adminId: adminId}, {base: idBase }] }},        
        
        {    
            $lookup:
            {
    
              from: "drivers",
              localField: "idDriver",//base
              foreignField: "_id",//drivers          
              as: "driver",
              pipeline: [
                { $project: { _id: 1, password: 0,  __v: 0 , base: 0} }
            ],
    
            }
        },         
      
        
        {
          $group: {
            
            base: {$first: "$base"},
            viajes: {$first: "$viajes"},
            adminId: {$first: "$adminId"},
            zonaName: {$first: "$zonaName"},
            ubicacion: {$first: "$ubicacion"},
            _id: "$_id",           
            drivers: {
    
              $push: "$driver",
            
            },           
            
          }
        },   
        {
          $unwind: "$drivers"
        },
               
    ]);  
        
    const data = Object.assign({}, ...result);    
   
    return data;
  } 
  
  

}

 



module.exports = new BaseRepository();