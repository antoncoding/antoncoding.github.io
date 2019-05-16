// MetaMask injects the web3 library for us.
window.onload = function() {
    if (typeof web3 === 'undefined') {
        console.log('Please install metamask')
        // $('#meta-mask-required').html('You need to install <a href="https://metamask.io/">&nbspMetaMask&nbsp</a> to login or pay for your membership');
        // $('#extend_button').hide();
    }
    else if(web3.eth.coinbase==null){
        console.log('please login')
        // $('#meta-mask-required').html('Please Unlock MetaMask to start.');
        // $('#extend_button').hide();
    }else{
        console.log(`Successfully log in as ${web3.eth.coinbase}`)
    }
}
