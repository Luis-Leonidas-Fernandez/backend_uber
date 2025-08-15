const { response } = require('express');
const Zona = require('../models/zona');
const Driver = require('../models/driver');
const Admin = require('../models/admin');
const Base = require('../models/base');
const baseRepository = require('../respositories/base_repository');
const { model } = require('mongoose');
const ObjectId = require('mongodb').ObjectId;




const addBaseDriver = async(req = request, res = response) => {          
   
    const  idDriver = req.params._id;
    
    const  { zona, base } = req.body;   
   
   

        //verifica si la zona existe

        const existZona = await Zona.find({ zona: zona})     
        
                             
        if (!existZona) {

         return res.status(400).json({
            ok: false,
            msg: 'la zona no se halla registrada'
        });
      }  
      
      //verifica que el conductor no se halle inscripto en una base
      const existDriver = await Base.findOne({ idDriver: idDriver})
     
     if (existDriver){

        return res.status(400).json({
           ok: false,
           msg: 'El conductor ya fue registrado con anterioridad en esta base'
       });

     }
      
     //busca la base y zona recibida por la request 
      const existBase = await Base.find({  $and: [{base: base}, {zonaName: zona}]})

      const leng =  existBase.length;
     

      if (leng === 0){

        return res.status(400).json({
           ok: false,
           msg: 'la base no se halla registrada ingrese otro numero de base'
       });       

     } 
        

      const id = existBase[0]._id; 
     
      const addDriver = await Base.findOneAndUpdate({_id: new ObjectId(id)}, {$addToSet: { idDriver: idDriver }},{ new: true });
        
      if(!addDriver){

        return res.status(400).json({
          ok: false,
          msg: 'No se ha podido registrar el conductor a la base elegida'
      });
      
    }  else {

      await Driver.findOneAndUpdate({_id: idDriver}, {$set: {base: new ObjectId(id)}}, {new: true});
      
      res.status(200).json({
          ok: true,
          addDriver
      });

    } 

    
      
    
     }
       

          




const addBaseAdmin = async(req = request, res = response) => {          
   
    const  idAdmin = req.params._id;
    const  { zona, base, ubicacion } = req.body;  
        

    const zonaAvailable = await Zona.find({ nombre: zona})      
        

    if (!zonaAvailable){
       return res.status(400).json({
            ok: false,
            msg: 'la zona no se halla registrada'
      });
    }  

    const admin = await Admin.find({ _id: idAdmin})
    
    if (!admin){
        return res.status(400).json({
           ok: false,
           msg: 'el admin no se halla registrado'
       });
     } 

    const existBase = await Base.findOne({ $and: [ {base: base}, {zonaName: zona} ] })         
     
    if (existBase){

        return res.status(400).json({
           ok: false,
           msg: 'la base fue registrada por otro usuario ingrese otro numero de base'
       });

     }  else {
       
      const object = {

      base:      Number(base),
      adminId:   new ObjectId(idAdmin),
      zonaName:  zonaAvailable[0].nombre,            
      ubicacion: {type: "Point", coordinates: ubicacion }

      }      
        
       
      const data = new Base(object);     
      const result = await data.save();
      const idBase = data._id; 
      
        
      //agregar Base Id a Admin Collection
      const registerOk = await Admin.findOneAndUpdate({_id: idAdmin}, {$set: { base: base }}, { new: true });
      
      // agregar Base Id a Zona Collection
      await Zona.findOneAndUpdate({nombre: zona}, {$set: {basesId: new ObjectId(idBase) }}, {new: true});    
      
      
      if(!registerOk) {
        return res.status(400).json({ok:false, msg: 'Error al Guardar Numero de Base'});
      }

     
      res.status(200).json({ ok: true, result});


     } 
          
}

const getDriversfromBase = async(req = request, res = response) => {          
   
    const  id = req.params._id;
    const  base = req.params.base;
    const adminId = new ObjectId(id);
    const idBase = parseInt(base);   
    
    
    const admin = await Admin.find({ _id: id})

  
    if (!admin){
      return res.status(400).json({
         ok: false,
         msg: 'el admin no se halla registrado'
     });
   } 

   const data = await baseRepository.findByIdAndDrivers(adminId, idBase);

   if (data.drivers === null) {   
       
    
    return res.json({
      ok: false,
      msg: 'No existen conductores registrados',
      data: data});
  
  } else {
    
    return res.json({ok: true, data});    
  }

   
        
}

const getAllBases = async(req = request, res = response) => {          

  const bases = await Base.find();     

  if (!bases){
     return res.status(400).json({
          ok: false,
          msg: 'No se hallaron bases registradas'
    });
  }  

  
    res.status(200).json({ ok: true, bases});

}

const enableDriver = async (req, res) => {
  const idParam = req.params._id.trim(); // usa :id en la ruta
  const idDriver =  new ObjectId(idParam);


  try {

    // busca si existe un conductor registrado
    // crea un campo online esto es necesario para habilitar a conductor

    const driverUpdated = await Driver.findByIdAndUpdate(
      idDriver,
      { $set: { online: false } }, 
      { new: true } // devuelve el doc actualizado
    );

    console.log('🚀 Respuesta del registro:', driverUpdated);

    if (!driverUpdated) {
      return res.status(404).json({
        ok: false,
        msg: 'Conductor no se encuentra registrado',
      });
    }
    
    const result = {
      email: driverUpdated.email,
      nombre: driverUpdated.nombre,
      apellido: driverUpdated.apellido,
      nacimiento: driverUpdated.nacimiento,
      domicilio: driverUpdated.domicilio,
      vehiculo: driverUpdated.vehiculo,
      model: driverUpdated.modelo,
      patente: driverUpdated.patente,
      licencia: driverUpdated.licencia,
      fotoFrente: driverUpdated.fotoFrente,
      fotoDorso: driverUpdated.fotoDorso,
      role: driverUpdated.role,
      order: driverUpdated.order,
      status: driverUpdated.status,
      viajes: driverUpdated.viajes,
      idAddress: driverUpdated.idAddress,
      viajes: driverUpdated.viajes,
      cupon: driverUpdated.cupon,
      online: driverUpdated.online
    };
   
    return res.status(200).json({
      ok: true,
      data: result,
    });

  } catch (error) {
    console.error('🟥 Error en el servidor:', error);
    return res.status(500).json({
      ok: false,
      msg: 'Hable con el administrador',
    });
  }
};
     

        




module.exports ={
    addBaseDriver,
    addBaseAdmin,
    getDriversfromBase,
    getAllBases,
    enableDriver
}