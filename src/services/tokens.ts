import { assetDataUtils, BigNumber } from '0x.js';
import { isWeeth, isWeth} from '../util/known_tokens';
import { Token, TokenBalance } from '../util/types';

import { getContractWrappers } from './contract_wrappers';

export const tokensToTokenBalances = async (tokens: Token[], address: string): Promise<TokenBalance[]> => {
    let weethToken = null;
    let webtcToken = null;
    let wethToken = null;

    tokens = tokens.filter((token) =>{
        if (isWeeth(token.symbol)){
            weethToken = token;
            return false;
        } else 
        // if (isWebtc(token.symbol)){
        //     webtcToken = token;
        //     return false;
        // }
        return true;
    })
    console.log('TCL: tokens', tokens);

    const contractWrappers = await getContractWrappers();
    
    const assetDatas = tokens.map(t => assetDataUtils.encodeERC20AssetData(t.address));
    const balancesAndAllowances = await contractWrappers.orderValidator.getBalancesAndAllowancesAsync(
        address,
        assetDatas,
    );

    const tokenBalances = balancesAndAllowances.map((b, i) => ({
        token: tokens[i],
        balance: b.balance,
        isUnlocked: b.allowance.isGreaterThan(0),
    }));

    if (weethToken){
        tokenBalances.push(await tokenToTokenBalance(weethToken, address))
    }

    // if (wethToken) {
    //     tokenBalances.push(await tokenToTokenBalance(wethToken, address))
    // }

    return tokenBalances;
};
export const tokenToTokenBalance = async (token: Token, address: string): Promise<TokenBalance> => {
    const contractWrappers = await getContractWrappers();

    const assetData = assetDataUtils.encodeERC20AssetData(token.address);
    const balanceAndAllowance = await contractWrappers.orderValidator.getBalanceAndAllowanceAsync(address, assetData);
    console.log('TCL: balanceAndAllowance', balanceAndAllowance);
    const { balance, allowance } = balanceAndAllowance;

    const isUnlocked = allowance.isGreaterThan(0);

    return {
        token,
        balance,
        isUnlocked,
    };
};

export const getTokenBalance = async (token: Token, address: string): Promise<BigNumber> => {
    const contractWrappers = await getContractWrappers();
    return contractWrappers.erc20Token.getBalanceAsync(token.address, address);
};