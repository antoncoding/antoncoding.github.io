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
    this.bc = new BroadcastChannel('test_channel')
    // this.connected = false
    this.addEventListeners()
    
  }

  addEventListeners() {
    const coolbitxcard = 'https://antoncoding.github.io'
    if (window.parent !== window) {
      // Open in Iframe
      console.log({opener: window.opener})
      onmessage = ({ data, source, origin }) => {
        if (data.target && data.target === 'CWS-IFRAME') {
          let fullscreen
          if (source === window.parent) { // data frin extebsuib
            fullscreen = window.open(coolbitxcard)
            fullscreen.focus()
            data.target = 'CWS-TAB'
            setTimeout(
              this.bc.postMessage(data, '*'), // pass to full screen?
              1000
            ) 
            console.log(`After relay message to tab`)
          } 
        }
      }

      this.bc.onmessage = (data) =>{
        this.sendMessageToExtension(data)
      }
    } else {
      // full screen or open directly
      // opener: global
      // referrer: undefined
      console.log(`open connect screen!`)
      this.bc.onmessage  = ({data, source, origin}) => {
        console.log(`got bc message!`)
        console.log(data)
        if (data && data.target === 'CWS-TAB') {
          console.log(`got message send to tab!`)
          console.log({source})
          const { action, params } = data
          const replyAction = `${action}-reply`
          switch (action) {
            case 'coolwallet-unlock':
              this.unlock(replyAction, params.hdPath)
              break
            case 'coolwallet-sign-transaction':
              this.signTransaction(replyAction, params.addrIndex, params.tx, params.to)
              break
            case 'coolwallet-sign-personal-message':
              this.signPersonalMessage(replyAction, params.addrIndex, params.message)
              break
          }
        } else {
          console.log(`got message ${JSON.stringify(data)}`)
        }
      }
    }
  }

  sendMessageToExtension(msg) {
    console.log(`send message back to parent`)
    window.parent.postMessage(msg, '*')
  }

  sendMessageToIframe(msg) {
    console.log(`send message back to iframe`)
    this.bc.postMessage(msg)
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
