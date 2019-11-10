'use strict'
import 'babel-polyfill';
import CoolWalletBridge from './ledger-bridge'


(async () => {
    const bridge = new CoolWalletBridge()
})()
console.log('MetaMask <=> CoolWallet initialized!')
