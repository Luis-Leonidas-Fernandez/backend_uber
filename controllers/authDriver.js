const { response } = require('express');
const bcrypt = require('bcryptjs');

const Driver=  require('../models/driver');
const {generarJWT} = require('../helpers/jwt');
const {urlMapboxKey, tokenMapBoxKey, idMapBoxKey, mapTokenKey} = require('../tokens/token.js');


const crearDriver = async(req, res = response) => {

const {         
         email,
         password,
         nombre,
         apellido,
         nacimiento,
         domicilio,
         vehiculo,
         modelo,
         patente,
         licencia   
} = req.body;



    try {

        const existeDriver = await Driver.findOne({ email, nacimiento:nacimiento, patente: patente });
        if (existeDriver) {
            return res.status(400).json({
                ok: false,
                msg: 'El conductor ya está registrado'
            });
        }

        //construir objeto
const data = {
        email,
        password,
        nombre,
        apellido,
        nacimiento: req.body.nacimiento,
        domicilio,
        vehiculo,
        modelo: req.body.modelo.toString(),
        patente: req.body.patente.toString(),
        licencia: req.body.licencia.toString(),


        }

        const newdriver = new Driver(data);
        
        // Encriptar contraseña
        const salt = bcrypt.genSaltSync();
        newdriver.password = bcrypt.hashSync(password, salt);

        await newdriver.save();

        // Generar mi JWT
        const token = await generarJWT(newdriver.id);

        const driver = {
            
            email:     newdriver.email,
            nombre:    newdriver.nombre,
            apellido:  newdriver.apellido,
            nacimiento:newdriver.nacimiento,
            domicilio: newdriver.domicilio,
            vehiculo:  newdriver.vehiculo,
            modelo:    newdriver.modelo,
            patente:   newdriver.patente,
            licencia:  newdriver.licencia,
            base:      newdriver.base,
            _id:       newdriver.id,              
            urlMapbox: urlMapboxKey,
            tokenMapBox:tokenMapBoxKey,
            idMapBox:   idMapBoxKey,
            mapToken:   mapTokenKey,
            base: ""

        }

        res.json({
            ok: true,
            driver,           
            token
        });


    } catch (error) {
       
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
}
const loginDriver = async(req, res = response) => {

    const { email, password } = req.body;
    
    try {

        const driverDB = await Driver.findOne({ email });
        
        if (!driverDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Email no encontrado'
            });
        }

        // Validar el password
        const validPassword = bcrypt.compareSync(password, driverDB.password);
        if (!validPassword) {
            return res.status(400).json({
                ok: false,
                msg: 'La contraseña no es valida'
            });
        }


        // Generar el JWT
        const token = await generarJWT(driverDB.id);

        const driver={

            _id: driverDB.id,
            email: driverDB.email,
            nombre: driverDB.nombre,
            apellido: driverDB.apellido,
            nacimiento: driverDB.nacimiento,
            domicilio: driverDB.domicilio,
            vehiculo: driverDB.vehiculo,
            modelo: driverDB.modelo,
            patente: driverDB.patente,
            licencia: driverDB.licencia,
            online: driverDB.online,
            role: driverDB.role,
            order: driverDB.order,
            viajes: driverDB.viajes,
            idAddress: driverDB.idAddress,
            time: driverDB.time,
            urlMapbox:   urlMapboxKey,
            tokenMapBox: tokenMapBoxKey,
            idMapBox:    idMapBoxKey,
            mapToken:    mapTokenKey,
            base:        driverDB.base


        }


        res.json({
            ok: true,
            driver: driver,            
            token
        });


    } catch (error) {
       
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        })
    }

}
const renewTokenDriver = async(req, res = response) => {

    const uid = req.uid;

    // generar un nuevo JWT, generarJWT... uid...
    const token = await generarJWT(uid);

    // Obtener el usuario por el UID, Usuario.findById... 
    const driver = await Driver.findById(uid);

    res.json({
        ok: true,
        driver,
        urlMapbox:   urlMapboxKey,
        tokenMapBox: tokenMapBoxKey,
        idMapBox:    idMapBoxKey,
        mapToken:    mapTokenKey,
        token,

    });

}


module.exports ={
    crearDriver,
    loginDriver,
    renewTokenDriver
    
}