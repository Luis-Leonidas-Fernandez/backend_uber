const { Schema, model } = require( 'mongoose');

const InvoiceSchema = Schema({

    
    adminId: {
        type: Schema.Types.ObjectId, 
        ref: 'Admin',      
        required: false        
    }, 
    baseId: {
        type: Schema.Types.ObjectId,
        ref: 'Base',
        required: false
    },
    periodo: {
        type: String,
        required: false
    },
    viajes: {
        
        cantidad: {
            type: Number,
            required: false
        },
        precio: {
            type: Number,
            required: false
        }
    },

    descuento: {
        type: Number,
        required: false
    },   

    soporte: {
        type: Number,
        required: false
    },    
    
}, 

{
    timestamps: true   

});

// Índice compuesto único con partialFilterExpression para garantizar unicidad e idempotencia por base y período.
// Excluye completamente documentos históricos y parciales, exigiendo que baseId sea un ObjectId y periodo sea un string.
InvoiceSchema.index(
    { baseId: 1, periodo: 1 },
    {
        unique: true,
        partialFilterExpression: {
            baseId: { $type: "objectId" },
            periodo: { $type: "string" }
        }
    }
);

// Deshabilitar autoIndex automático en producción para control explícito de SRE
InvoiceSchema.set('autoIndex', false);

InvoiceSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    object.uid = this._id;
    return object;
})



module.exports = model('Invoice',
    InvoiceSchema);