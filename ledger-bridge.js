'use strict'
import 'babel-polyfill'

require('buffer')

import WebBleTransport from '@coolwallets/transport-web-ble'
// import CoolWallet, { generateKeyPair } from '@coolwallets/wallet'
import CoolWalletEth from '@coolwallets/eth'

const appPrivateKey = 'e80a4a1cbdcbe96749b9d9c62883553d30aa84aac792783751117ea6c52a6e3f'
const appId = '50fb246982570ce2198a51cde1f12cbc1e0ef344'

export default class CoolWalletBridge {
  constructor() {
    this.transport = new WebBleTransport()
    this.app = new CoolWalletEth(this.transport, appPrivateKey, appId)
    this.connected = false
    this.addEventListeners()
  }

  addEventListeners() {
    const coolbitxcard = 'https://antoncoding.github.io'
    console.log({ parent: window.parent })
    console.log({window})

    if (window.parent !== window) { // Open in Iframe
      onmessage = ({ data, source, origin }) => {
        if (source === window.parent) { // dapp
        console.log({ origin })
        console.log({ referrer: window.referrer })
     
        console.log(data)
        const fullscreen = window.open(coolbitxcard)
        fullscreen.focus()
        source.postMessage('message to source', '*')
        window.parent.postMessage('foo', '*')
        } else if (source === fullscreen) {
           window.parent.postMessage(data, '*')
        }
      }
    } else { // coolbitxcard is directly opened in a tab
      if (window.opener) {
        if (window.referrer === coolbitxcard) {
          const result = prompt('hello cooltibx user, please confirm xyz')
          if (result === true) {
            window.opener.postMessage('signed data from wallet blabla')
            window.opener.focus()
          }
   
        }
      }
      console.log(`what`)
    }
    // window.addEventListener(
    //   'message',
    //   async event => {
    //     if (event && event.data && event.data.target === 'CWS-IFRAME') {
    //       const { action, params } = e.data
    //       const replyAction = `${action}-reply`
    //       switch (action) {
    //         case 'coolwallet-unlock':
    //           this.unlock(replyAction, params.hdPath)
    //           break
    //         case 'coolwallet-sign-transaction':
    //           this.signTransaction(replyAction, params.addrIndex, params.tx, params.to)
    //           break
    //         case 'coolwallet-sign-personal-message':
    //           this.signPersonalMessage(replyAction, params.addrIndex, params.message)
    //           break
    //       }
    //     }
    //   },
    //   false
    // )
  }

  sendMessageToExtension(msg) {
    window.parent.postMessage(msg, '*')
  }

  async connectWallet() {
    try {
      if (!this.connected) {
        console.log(`try to connect`)
        await this.transport.connect()
        this.connected = true
      }
    } catch (e) {
      console.log('CWS:::CONNECTION ERROR', e)
    }
  }

  cleanUp() {
    this.app = null
  }

  async unlock(replyAction, addIndex) {
    try {
      await this.connectWallet()
      const { parentPublicKey, parentChainCode } = await this.app.getPublicKey(addIndex, true)
      const res = { parentChainCode, parentPublicKey }
      this.sendMessageToExtension({
        action: replyAction,
        success: true,
        payload: res,
      })
    } catch (err) {
      this.sendMessageToExtension({
        action: replyAction,
        success: false,
        payload: { error: err.toString() },
      })
    } finally {
      this.cleanUp()
    }
  }

  async signTransaction(replyAction, hdPath, tx) {
    try {
      await this.connectWallet()
      const res = await this.app.signTransaction(hdPath, tx)
      this.sendMessageToExtension({
        action: replyAction,
        success: true,
        payload: res,
      })
    } catch (err) {
      this.sendMessageToExtension({
        action: replyAction,
        success: false,
        payload: { error: err.toString() },
      })
    } finally {
      this.cleanUp()
    }
  }

  async signPersonalMessage(replyAction, addIndex, message) {
    try {
      await this.connectWallet()
      const res = await this.app.signMessage(message, addIndex)

      this.sendMessageToExtension({
        action: replyAction,
        success: true,
        payload: res,
      })
    } catch (err) {
      this.sendMessageToExtension({
        action: replyAction,
        success: false,
        payload: { error: err.toString() },
      })
    } finally {
      this.cleanUp()
    }
  }
}
