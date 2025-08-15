const { Schema, model } = require('mongoose');

const DriverSchema = Schema({

    
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    nacimiento: {
        type: String,
        required: true
    },    
    domicilio: {
        type: String,
        required: true
    },
    vehiculo: {
        type: String,
        required: true
    },
    modelo: {
        type: String,
        required: true
    },
    patente: {
        type: String,
        required: true
    },
    licencia: {
        type: String,
        required: true
    },

    fotoFrente: {
        type: String,
        required: false
    },
    fotoDorso: {
        type: String,
        required: false
    },
    
    online: {
        type: Boolean,
        require: false
    },
    role: {
        type: String,
        enum: ['user', 'driver','admin'],
        default: 'driver'
    },   

    order: {    
        type: String,
        enum: ['en-preparacion', 'libre', 'en-camino', 'llego-conductor' ],
        default: 'en-preparacion'
    },

    status: {
        type: String,
        enum: ['disponible', 'no disponible' ],
        default: 'disponible'
    },
    

    viajes: {
        type: Number,
        default: 0,
        required: false
    },
    urlMapbox: {
        type: String,
        required: false
    },
    tokenMapBox: {
        type: String,
        required: false
    },
    idMapBox: {
        type: String,
        required: false
    },
    mapToken: {
        type: String,
        required: false
    },
   
    
    idAddress: [{
        type: Schema.Types.ObjectId, 
        ref: 'Address',      
        required: false,
    }],

    cupon:{
        type: Array,
        required: false,
        default: [""]
    },
    
    base: {
        type: Schema.Types.ObjectId, 
        ref: 'base',      
        required: false,
        
    },

       time : { type : Date, default: Date.now }
});

DriverSchema.method('toJSON', function() {
    const { __v, _password, ...object } = this.toObject();
    //object.uuid = _id;
    return object;
})


module.exports = model('Driver',
    DriverSchema);