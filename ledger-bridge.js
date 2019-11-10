'use strict'
import 'babel-polyfill'

require('buffer')

import WebBleTransport from '@coolwallets/transport-web-ble'
import CoolWallet, { generateKeyPair } from '@coolwallets/wallet'
import CoolWalletEth from '@coolwallets/eth'

const appPrivateKey = 'e80a4a1cbdcbe96749b9d9c62883553d30aa84aac792783751117ea6c52a6e3f'
const appId = '50fb246982570ce2198a51cde1f12cbc1e0ef344'

export default class CoolWalletBridge {
  constructor() {
    this.addEventListeners()
    this.transport = new WebBleTransport()
    this.app = new CoolWalletEth(this.transport, appPrivateKey, appId)
    this.connected = false
  }

  addEventListeners() {
    window.addEventListener(
      'message',
      async e => {
        if (e && e.data && e.data.target === 'CWS-IFRAME') {
          const { action, params } = e.data
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
          console.log('Got message somewhere')
          console.log(e)
        }
      },
      false
    )
  }

  sendMessageToExtension(msg) {
    window.parent.postMessage(msg, '*')
  }

  async connectWallet() {
    try {
      if (!this.connected) await this.transport.connect()
      this.connected = true
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
