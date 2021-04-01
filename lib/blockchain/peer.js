const R = require('ramda');


/*
{ // Peer Structure
    "url: xxx.xxx.xxx.xxx:port, //
}
*/

class Peer {

    construct(){
        this.url = null;
    }


    static fromJson(data) {
        let peer = new Peer();
        R.forEachObjIndexed((value, key) => {
            if (key == 'url' && value) {
                peer.url = value;
            } 
        }, data);

        return peer;
    }
}

module.exports = Peer;
