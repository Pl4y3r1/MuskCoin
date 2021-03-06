const HttpServer = require('./httpServer');
const Blockchain = require('./blockchain');
const Operator = require('./operator');
const Miner = require('./miner');
const Node = require('./node');
const Peer = require('./blockchain/peer');
const Peers = require('./blockchain/peers');
const Db = require('./util/db');

const PEER_FILE = 'peers.json';

module.exports = function MuskCoin(host, port, peers, logLevel, name) {
    host = process.env.HOST || host || 'localhost';
    port = process.env.PORT || process.env.HTTP_PORT || port || 3001;
    peers = (process.env.PEERS ? process.env.PEERS.split(',') : peers || []);
    peers = peers.map((peer) => { return { url: peer }; });
    logLevel = (process.env.LOG_LEVEL ? process.env.LOG_LEVEL : logLevel || 6);    
    name = process.env.NAME || name || '1';

    require('./util/consoleWrapper.js')(name, logLevel);

    console.info(`Starting node ${name}`);
    if (peers.length > 0){
	for(let i = 0; i < peers.length; i++){
            console.info('Peers:' + peers[i].url);
	}
    } else{
        //scan peer file
        this.peerDb = new Db('data/' + name + '/' + PEER_FILE, new Peers());
        peers = this.peerDb.read(Peers);
        console.info('Gathering Peers...');
        for (let i = 0; i < peers.length; i++){
            console.info('Peer:' + peers[i].url);
        }
    }

    let blockchain = new Blockchain(name,peers);
    let operator = new Operator(name, blockchain);
    let miner = new Miner(name, blockchain, logLevel);
    let node = new Node(host, port, peers, blockchain, name);
    let httpServer = new HttpServer(node, blockchain, operator, miner);

    httpServer.listen(host, port);
};
