const crypto = require('crypto');



function randomValueHex (len) {
    return crypto.randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0,len).toUpperCase();
        // return required number of characters        

}

const generateVaucher = async () => {

    const vaucher = randomValueHex(4)+"-"+randomValueHex(4)+"-"+randomValueHex(4);    
    return vaucher;

}




module.exports ={
    generateVaucher,
  
    
}
