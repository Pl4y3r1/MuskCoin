const R = require('ramda');
const Wallets = require('./wallets');
const Wallet = require('./wallet');
const Transaction = require('../blockchain/transaction');
const TransactionBuilder = require('./transactionBuilder');
const Db = require('../util/db');
const ArgumentError = require('../util/argumentError');
const Blockchain = require('../blockchain/index');
const MuskCoin = require('../MuskCoin');
const Config = require('../config');

const OPERATOR_FILE = 'wallets.json';

class Operator {
    constructor(dbName, blockchain) {
        this.db = new Db('data/' + dbName + '/' + OPERATOR_FILE, new Wallets());
	this.dbName = dbName;

        // INFO: In this implementation the database is a file and every time data is saved it rewrites the file, probably it should be a more robust database for performance reasons
        this.wallets = this.db.read(Wallets);
        this.blockchain = blockchain;
    }
    
    static blockchainOnly(name, blockchain){
    	return new Operator(name, blockchain);
    }
   
    addWallet(wallet) {
        this.wallets.push(wallet);
        this.db.write(this.wallets);
        return wallet;
    }

    createWalletFromPassword(password) {
        let newWallet = Wallet.fromPassword(password);
        return this.addWallet(newWallet);
    }    

    checkWalletPassword(walletId, passwordHash) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);

        return wallet.passwordHash == passwordHash;
    }

    getWallets() {
        return this.wallets;
    }

    getWalletById(walletId) {
        return R.find((wallet) => { return wallet.id == walletId; }, this.wallets);
    }

    generateAddressForWallet(walletId) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);

        let address = wallet.generateAddress();
        this.db.write(this.wallets);
        return address;
    }

    getAddressesForWallet(walletId) {
        let wallet = this.getWalletById(walletId);
        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);

        let addresses = wallet.getAddresses();
        return addresses;
    }    

    getBalanceForAddress(addressId) {        
        let utxo = this.blockchain.getUnspentTransactionsForAddress(addressId);

        if (utxo == null || utxo.length == 0) throw new ArgumentError(`No transactions found for address '${addressId}'`);
        return R.sum(R.map(R.prop('amount'), utxo));
    }

    createTransaction(walletId, fromAddressId, toAddressId, amount, changeAddressId) {
        let utxo = this.blockchain.getUnspentTransactionsForAddress(fromAddressId);
        let wallet = this.getWalletById(walletId);
        let walletList = this.wallets
        let flag = 0;
        let alength;
        let a;

        if (wallet == null) throw new ArgumentError(`Wallet not found with id '${walletId}'`);

        let secretKey = wallet.getSecretKeyByAddress(fromAddressId);

        if (secretKey == null) throw new ArgumentError(`Secret key not found with Wallet id '${walletId}' and address '${fromAddressId}'`);
        
        //Let's make sure that the fromAddress exists in the blockchain
        let w = this.getWallets();
        let length = w.length;
        for (let i = 0; i < length; i++){
        	a  = w[i].getAddresses();
               	alength = a.length;
               	for (let j = 0; j < alength; j++){
               		if (fromAddressId == a[j]){
               			flag = 1;
               		}
          	}
        }
                
        if (flag == 0) throw new ArgumentError('toAddress not found in blockchain');
        
        //Let's also avoid processing transactions where 0 coins are sent, at least for now
        
        if (amount == 0) throw new ArgumentError('Cannot send 0 coins');

        let tx = new TransactionBuilder();
        tx.from(utxo);
        tx.to(toAddressId, amount);
        tx.change(changeAddressId || fromAddressId);
        tx.fee(Config.FEE_PER_TRANSACTION);
        tx.sign(secretKey);        

        return Transaction.fromJson(tx.build());
    }
}

module.exports = Operator;
