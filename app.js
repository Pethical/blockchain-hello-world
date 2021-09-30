const ec = require('eccrypto');
const express = require('express');
const crypto = require('crypto');

class Blockchain{
	constructor(){
		this._blocks = [];
	}

	addBlock(block) {
		if(!block.IsValidHash(block._hash))
			return false;
		this._blocks.push(block);
	}

	getBalance(pubKey){
		var balance = 0;
		this._blocks.forEach( block => {
				 if(block._miner.equals(pubKey)) balance += block._reward ;
				 block._transactions.forEach( tr => {
					if(tr._from.equals(pubKey)) balance -= tr._amount;
					if(tr._to.equals(pubKey)) balance += tr._amount;
				});
		} );
		return balance;
	}

}

class Block{
	constructor(number, prevBlockHash, miner) {
		this._number = number;
		this._prevBlockHash = prevBlockHash;
		this._miner = miner;
		this._reward = 100;
		this._transactions = [];
		this._hash = Block.calcBlockHash(this);
		this._timestamp = new Date() / 1000;
		this._nonce = 0;
	}

	static calcBlockHash(block) {
		var trhash = '';
		block._transactions.forEach( tr => trhash += tr._hash);
		return crypto.createHash('SHA256').update(Buffer.from([block._number, block._prevBlockHash, block._miner, block._reward, block._timestamp, block._nonce, trhash])).digest();
	}

	IsValidHash(hash) {
		return (hash[0] == 0);
	}

	mineBlock(block){
		while(!this.IsValidHash(block._hash)) {
			block._nonce++;
			block._timestamp = new Date()/1000;
			console.log(block._nonce);
			block._hash = Block.calcBlockHash(block);
		}
	}

	async addTransaction(tr){
		if(!await tr.checkTransaction()) return;
		this._transactions.push(tr);
	}
}


class Transaction{
	constructor(from, to, amount){
		this._from = from;
		this._to = to;
		this._amount = amount;
		this._hash = this.calcHash();
		this._signature = null;
	}

	calcHash(){
		return crypto.createHash('SHA256').update(Buffer.from([this._from, this._to, this._amount])).digest();
	}

	async signTransaction(privateKey) {
		this._signature = await ec.sign(privateKey, this._hash);
	}

	async checkTransaction(){
		try {
			await ec.verify(this._from, this._hash, this._signature);
			return true;
		} catch {
			return false;
		}
	}

}

let myKey = ec.generatePrivate();
let myPublicKey = ec.getPublic(myKey);

console.log("My private key: "+myKey.toString('hex'));
console.log("My public key:" + myPublicKey.toString('hex'));

let blockChain = new Blockchain();

let block = new Block(0, '', myPublicKey);
block.mineBlock(block);
blockChain.addBlock(block);

var toKey = ec.generatePrivate();
var toPublicKey = ec.getPublic(toKey);

let block2 = new Block(1, block._hash, myPublicKey);
var tr = new Transaction(myPublicKey, toPublicKey, 1);

tr.signTransaction(myKey).then(function(){
	block2.addTransaction(tr).then(function(){
		block2.mineBlock(block2);
		blockChain.addBlock(block2);
		console.log(blockChain);
		console.log("My balance: " + blockChain.getBalance(myPublicKey));
		console.log("Reciever balance: " + blockChain.getBalance(toPublicKey));
	});
});
