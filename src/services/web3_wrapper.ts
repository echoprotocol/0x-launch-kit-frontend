import { Web3Wrapper } from '@0x/web3-wrapper';

// @ts-ignore
import EchoWeb3, { BridgeProvider } from 'echo-web3';
// @ts-ignore
import * as Web3 from 'web3';
import { sleep } from '../util/sleep';

let isAccountWasSet = false;
let isFirstSwitchNetwork = true;

let echoWeb3Instance: EchoWeb3 | null = null;
let web3Wrapper: Web3Wrapper | null = null;
const WrappedEchoWeb3 = EchoWeb3(Web3);

export const isMetamaskInstalled = (): boolean => {
    const { echojslib } = window as any;
    return echojslib && echojslib.isEchoBridge; 
};

export const initializeWeb3Wrapper = async (): Promise<Web3Wrapper | null> => {
    const { location } = window;
    const { echojslib } = window as any;

    if (web3Wrapper) {
        await echoWeb3Instance.currentProvider.enable();
        return web3Wrapper;
    }
    if (echojslib && echojslib.isEchoBridge) {
        return new Promise(async (resolve, reject) => {
            const bridgeProvider = new BridgeProvider();
            echoWeb3Instance = new WrappedEchoWeb3(bridgeProvider);

            await bridgeProvider.init();
            await echoWeb3Instance.currentProvider.enable();
            
            // Request account access if needed
            web3Wrapper = new Web3Wrapper(echoWeb3Instance.currentProvider);
            echoWeb3Instance = echoWeb3Instance;

            // Subscriptions register
            echojslib.extension.subscribeSwitchAccount(() => {
                // waiting the first setting of an account before using of web3
                if (isAccountWasSet) {
                    location.reload();
                } else {
                    // TODO sometimes the echojslib.extension.activeAccount is null
                    isAccountWasSet = true;
                    return resolve(web3Wrapper);
                }
            });
            echojslib.extension.subscribeSwitchNetwork(() => {
                if (!isFirstSwitchNetwork) {
                    location.reload();
                } else {
                    isFirstSwitchNetwork = false;
                }
            });

            if (isAccountWasSet) {
                // account has been set, therefore we can return of web3
                return resolve(web3Wrapper);
            }
        });
    } else {
        //  The user does not have metamask installed
        return null
    }
};

export const getWeb3Wrapper = async (): Promise<Web3Wrapper> => {
    while (!web3Wrapper) {
        // if web3Wrapper is not set yet, wait and retry
        await sleep(100);
    }

    return web3Wrapper;
};
