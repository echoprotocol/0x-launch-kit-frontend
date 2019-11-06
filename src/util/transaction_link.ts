import { NETWORK_ID } from '../common/constants';
import { Network } from '../util/types';

const ETHERSCAN_TRANSACTION_URL: { [key: number]: string } = {
    [Network.Devnet]: 'https://rinkeby.etherscan.io/tx/',
};

export const getTransactionLink = (hash: string): string => {
    return `${ETHERSCAN_TRANSACTION_URL[NETWORK_ID]}${hash}`;
};
