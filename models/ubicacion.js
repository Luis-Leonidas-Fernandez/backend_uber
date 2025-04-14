const { Schema, model } = require('mongoose');

const AddressSchema = Schema({

    miId: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: false,
    },

    idDriver: {
        type: Schema.Types.ObjectId, 
        ref: 'Driver',      
        required: false
        
    },    

    estado:{
        type: Boolean,
        required: false
    },

    ubicacion: { 
        type:{
            type: String,            
            enum: ['Point'], 
            required: true,
        },          
        coordinates: {
            type: [Number],
            required: false,
            index: '2dsphere'          
    },  
        
   },
   destino: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: false,
      index: '2dsphere'
    },
  },

    mensaje: {

        type:{
            type: String,            
            enum: ['Point'], 
            default: 'Point',
            
        },  
        coordinates: {
            type: Array,
            required: false   
    },    
       
   },

     precio: {
      type: Number,
      required: false,
    },

     distanciaKm: {
     type: Number,
     required: false,
    },
    horaEsperaInicio: {
        type: Date,
        required: false  
    },
    horaEsperaFin: {
        type: Date,
        required: false,
        default: null  
    },

    precioTotal: {
        type: Number,
        required: false,
      },
      finalizado: {
        type: String,
        required: false,
      },  
   
   blackList: {
    type: [Schema.Types.ObjectId],
    ref: 'Driver',
    default: []
  },
  
    
}, 

{
    timestamps: true
});

AddressSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();    
    return object;
})

module.exports = model('Address', AddressSchema);