'use strict'
import 'babel-polyfill';
import CoolWalletBridge from './bridge'


(async () => {
    const bridge = new CoolWalletBridge()
    window.bridge = bridge
})()

