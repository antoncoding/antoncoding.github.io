'use strict'
import 'babel-polyfill'

require('buffer')

import WebBleTransport from '@coolwallets/transport-web-ble'
import CoolWalletEth from '@coolwallets/eth'

const appPrivateKey = 'e80a4a1cbdcbe96749b9d9c62883553d30aa84aac792783751117ea6c52a6e3f'
const appId = '50fb246982570ce2198a51cde1f12cbc1e0ef344'

export default class CoolWalletBridge {
  constructor() {
    this.bc = new BroadcastChannel('coolwallets')
    this.childTab = null
    this.blockOnFirstCall = true
    this.addEventListeners()
  }

  addEventListeners() {
    const tabDomain = 'https://antoncoding.github.io'
    if (window.parent !== window) {
      onmessage = async ({ data, source, origin }) => {
        if (data.target === 'CWS-IFRAME') {
          if (source === window.parent) {
            
            // data from extension
            data.target = 'CWS-TAB'
            this.childTab = window.open(tabDomain, "tab")
            
            while (this.blockOnFirstCall === true) {
              console.log(`blocking...`)
              await this.sleep(1000)
            }
            console.log(`sending to child`)
            this.bc.postMessage(data, '*') // pass to full screen?
              
            this.childTab.focus()
          }
        }
      }

      this.bc.onmessage = ({data, source}) => {
        console.log(`got bc message ${JSON.stringify(data)}`)
        if ( data.target === 'connection-success' ) {
          console.log(`child tab connected!`)
          this.blockOnFirstCall = false
        } else {
          this.sendMessageToExtension(data)
        }
        
      }
    } else {
      // full screen or open directly .Opener: global, referrer: undefined
      console.log(`set up bc onmessage....`)
      this.bc.onmessage = ({ data, source, origin }) => {
        if (data && data.target === 'CWS-TAB') {
          const { action, params } = data
          const replyAction = `${action}-reply`
          switch (action) {
            case 'coolwallet-unlock':
              this.unlock(replyAction, params.addrIndex)
              break
            case 'coolwallet-sign-transaction':
              this.signTransaction(replyAction, params.addrIndex, params.tx, params.publicKey)
              break
            case 'coolwallet-sign-personal-message':
              this.signPersonalMessage(replyAction, params.addrIndex, params.message, params.publicKey)
              break
          }
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
    console.log(msg)
    this.bc.postMessage(msg)
    window.opener.focus()
  }

  async userConenct() {
    WebBleTransport.listen(async (err, device) => {
      if (err) {
        throw err
      }
      this.transport = await WebBleTransport.connect(device)
      this.bc.postMessage({target:'connection-success'})
    })
  }

  async waitForConnection() {
    try {
      while (this.transport === null) {
        setTimeout(
          console.log('Waiting for bluetooth'),
          3000
        )
      }
      this.app = new CoolWalletEth(this.transport, appPrivateKey, appId)
    } catch (e) {
      console.log('CWS:::CONNECTION ERROR', e)
    }
  }

  cleanUp() {
    this.app = null
  }

  async unlock(replyAction, addrIndex) {
    try {
      await this.waitForConnection()
      const res = await this.app.getPublicKey(addrIndex, true)
      this.sendMessageToIframe({
        action: replyAction,
        success: true,
        payload: res,
      })
    } catch (err) {
      this.sendMessageToIframe({
        action: replyAction,
        success: false,
        payload: { error: err.toString() },
      })
    } finally {
      this.cleanUp()
    }
  }

  async signTransaction(replyAction, addrIndex, tx, publicKey) {
    try {
      await this.waitForConnection()
      const res = await this.app.signTransaction(tx, addrIndex, publicKey)
      this.sendMessageToIframe({
        action: replyAction,
        success: true,
        payload: res,
      })
    } catch (err) {
      this.sendMessageToIframe({
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
      await this.waitForConnection()
      const res = await this.app.signMessage(message, addIndex)

      this.sendMessageToIframe({
        action: replyAction,
        success: true,
        payload: res,
      })
    } catch (err) {
      this.sendMessageToIframe({
        action: replyAction,
        success: false,
        payload: { error: err.toString() },
      })
    } finally {
      this.cleanUp()
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
