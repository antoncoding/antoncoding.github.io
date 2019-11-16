'use strict'
import 'babel-polyfill'

require('buffer')

import WebBleTransport from '@coolwallets/transport-web-ble'
import CoolWallet from '@coolwallets/wallet'
import CoolWalletEth from '@coolwallets/eth'

import { getAppKeys } from './utils'
const { appPublicKey, appPrivateKey } = getAppKeys()

export default class CoolWalletBridge {
  constructor() {
    this.bc = new BroadcastChannel('coolwallets')
    this.addEventListeners()
    console.log(`new bridge...`)
    this.cleanTab()
  }

  addEventListeners() {
    const tabDomain = 'https://antoncoding.github.io'
    if (window.parent !== window) {
      onmessage = async ({ data, source, origin }) => {
        if (data.target === 'CWS-IFRAME') {
          if (source === window.parent) {
            
            // data from extension
            data.target = 'CWS-TAB'
            this.openOnce(tabDomain, "coolwallets-tab")
            // if (this.childTab === null){
            //   this.childTab = this.openOnce(tabDomain, "tab")
            //   this.childTab.onbeforeunload = this.cleanTab()
            // } else {
            //   this.childTab.focus()
            // }
            
            while (this.blockOnFirstCall === true) {
              console.log(`blocking...`)
              await this.sleep(1000)
            }
            this.bc.postMessage(data, '*')
          }
        }
      }

      this.bc.onmessage = ({data, source}) => {
        if ( data.target === 'connection-success' ) {
          console.log(`child tab connected!`)
          this.blockOnFirstCall = false
        } else {
          this.sendMessageToExtension(data)
        }
        
      }
    } else {
      this.bc.onmessage = ({ data }) => {
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
            case 'coolwallet-sign-typed-data':
              this.signTypedData(replyAction, params.addrIndex, params.typedData, params.publicKey)
              break
          }
        }
      }
    }
  }

  sendMessageToExtension(msg) {
    window.parent.postMessage(msg, '*')
  }

  sendMessageToIframe(msg) {
    this.bc.postMessage(msg)
  }

  async register(password) {
    const appId =  this.getAppId()
    const wallet = new CoolWallet(this.transport, appPrivateKey, appId)
    wallet.register(appPublicKey, password, "CoolWalletBridge").then(appId => {
      localStorage.setItem("appId", appId)
    })
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
          console.log('Waiting for connection'),
          3000
        )
      }
      const appId = this.getAppId()
      this.app = new CoolWalletEth(this.transport, appPrivateKey, appId)
    } catch (e) {
      console.log('CWS:::CONNECTION ERROR', e)
    }
  }

  getAppId(){
    return localStorage.getItem("appId")
  }

  cleanUp() {
    this.app = null
  }
  
  cleanTab(){
    console.log(`Cleaning iframe memory for tab`)
    // this.childTab = null
    this.blockOnFirstCall = true
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

  async signPersonalMessage(replyAction, addIndex, message, publicKey) {
    try {
      await this.waitForConnection()
      const res = await this.app.signMessage(message, addIndex, publicKey)

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

  async signTypedData(replyAction, addrIndex, typedData, publicKey) {
    try {
      await this.waitForConnection()
      const res = await this.app.signTypedData(typedData, addrIndex, publicKey)
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

  openOnce(url, target){
    var winref = window.open('', target, '', true);

    // if the "target" window was just opened, change its url
    if(winref.location.href === 'about:blank'){
        winref.location.href = url;
    }
    return winref;
  }


  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
