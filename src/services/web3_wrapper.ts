import { Web3Wrapper } from '@0x/web3-wrapper';

import { sleep } from '../util/sleep';
const Web3 = require('web3');
const EchoWeb3 = require('echo-web3').default;
const { BridgeProvider } = require('echo-web3');

let isFirstSwitchAccount = true;
let isFirstSwitchNetwork = true;
let web3Wrapper: Web3Wrapper | null = null;
const WrappedWeb3 = EchoWeb3(Web3);

export const isMetamaskInstalled = (): boolean => {
    const { echojslib } = window as any;
    return echojslib || echojslib.isEchoBridge;
};

export const initializeWeb3Wrapper = async (): Promise<Web3Wrapper | null> => {
    const { location } = window;
    const { echojslib } = window as any;

    if (web3Wrapper) {
        return web3Wrapper;
    }
    if (echojslib && echojslib.isEchoBridge) {
        const bridgeProvider = new BridgeProvider();
        const web3 = new WrappedWeb3(bridgeProvider);

        await bridgeProvider.init();
        await web3.currentProvider.enable();

        // Request account access if needed
        web3Wrapper = new Web3Wrapper(web3.currentProvider);

        // Subscriptions register
        echojslib.extension.subscribeSwitchAccount(() => {
            if (!isFirstSwitchAccount) {
                location.reload();
            } else {
                isFirstSwitchAccount = false;
            }
        });
        echojslib.extension.subscribeSwitchNetwork(() => {
            if (!isFirstSwitchAccount) {
                location.reload();
            } else {
                isFirstSwitchNetwork = false;
            }
        });

        return web3Wrapper;
    } else {
        //  The user does not have metamask installed
        return null;
    }
};

export const getWeb3Wrapper = async (): Promise<Web3Wrapper> => {
    while (!web3Wrapper) {
        // if web3Wrapper is not set yet, wait and retry
        await sleep(100);
    }

    return web3Wrapper;
};
