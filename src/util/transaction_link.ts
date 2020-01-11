import { NETWORK_ID } from '../common/constants';
import { Network } from '../util/types';

//@ts-ignore
import { utils } from 'echo-web3';

const ETHERSCAN_TRANSACTION_URL: { [key: number]: string } = {
    [Network.Testnet]: 'https://explorer.echo.org/blocks/',
};

export const getTransactionLink = (hash: string): string => {
    const { blockNumber, txIndex } = utils.transactionUtils.decodeTxHash(hash);
    return `${ETHERSCAN_TRANSACTION_URL[NETWORK_ID]}${blockNumber}/${txIndex + 1}?op=1`;
};
