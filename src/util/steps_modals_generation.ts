import { BigNumber, SignedOrder } from '0x.js';

import { isWeth, isZrx, isWeeth, isWebtc } from './known_tokens';
import {
    Collectible,
    OrderSide,
    Step,
    StepBuyCollectible,
    StepKind,
    StepToggleTokenLock,
    StepUnlockCollectibles,
    StepWrapEth,
    StepWrapEeth,
    Token,
    TokenBalance,
    StepWrapEbtc
} from './types';

export const createBuySellLimitSteps = (
    baseToken: Token,
    quoteToken: Token,
    tokenBalances: TokenBalance[],
    wethTokenBalance: TokenBalance,
    weethTokenBalance: TokenBalance,
    webtcTokenBalance: TokenBalance,
    amount: BigNumber,
    price: BigNumber,
    side: OrderSide,
    makerFee: BigNumber,
): Step[] => {
    const buySellLimitFlow: Step[] = [];
    let unlockBaseOrQuoteTokenStep;

    // unlock base and quote tokens if necessary

    unlockBaseOrQuoteTokenStep =
        side === OrderSide.Buy
            ? // If it's a buy -> the quote token has to be unlocked
            getUnlockTokenStepIfNeeded(quoteToken, tokenBalances, wethTokenBalance, weethTokenBalance, webtcTokenBalance)
            : // If it's a sell -> the base token has to be unlocked
            getUnlockTokenStepIfNeeded(baseToken, tokenBalances, wethTokenBalance, weethTokenBalance, webtcTokenBalance);

    if (unlockBaseOrQuoteTokenStep) {
        buySellLimitFlow.push(unlockBaseOrQuoteTokenStep);
    }

    // unlock zrx (for fees) if it's not one of the traded tokens and if the maker fee is positive
    if (!isZrx(baseToken.symbol) && !isZrx(quoteToken.symbol) && makerFee.isGreaterThan(0)) {
        const unlockZrxStep = getUnlockZrxStepIfNeeded(tokenBalances);
        if (unlockZrxStep) {
            buySellLimitFlow.push(unlockZrxStep);
        }
    }

    // wrap the necessary ether if it is one of the traded tokens
    if (isWeth(baseToken.symbol) || isWeth(quoteToken.symbol)) {
        const wrapEthStep = getWrapEthStepIfNeeded(amount, price, side, wethTokenBalance);
        if (wrapEthStep) {
            buySellLimitFlow.push(wrapEthStep);
        }
    } else if (isWeeth(baseToken.symbol) || isWeeth(quoteToken.symbol)) {
        const wrapEethStep = getWrapEethStepIfNeeded(amount, price, side, weethTokenBalance);
        if (wrapEethStep) {
            buySellLimitFlow.push(wrapEethStep);
        }
    } else if (isWebtc(baseToken.symbol) || isWebtc(quoteToken.symbol)) {
        const wrapEethStep = getWrapEbtcStepIfNeeded(amount, price, side, webtcTokenBalance);
        if (wrapEethStep) {
            buySellLimitFlow.push(wrapEethStep);
        }
    }



    buySellLimitFlow.push({
        kind: StepKind.BuySellLimit,
        amount,
        price,
        side,
        token: baseToken,
    });

    return buySellLimitFlow;
};

export const createSellCollectibleSteps = (
    collectible: Collectible,
    startPrice: BigNumber,
    side: OrderSide,
    isUnlocked: boolean,
    expirationDate: BigNumber,
    endPrice: BigNumber | null,
): Step[] => {
    const sellCollectibleFlow: Step[] = [];

    // Unlock collectible
    if (!isUnlocked) {
        const unlockCollectibleStep = getUnlockCollectibleStep(collectible);
        sellCollectibleFlow.push(unlockCollectibleStep);
    }

    // Sign order step
    sellCollectibleFlow.push({
        kind: StepKind.SellCollectible,
        collectible,
        startPrice,
        endPrice,
        expirationDate,
        side,
    });

    return sellCollectibleFlow;
};

export const createBasicBuyCollectibleSteps = (order: SignedOrder, collectible: Collectible): Step[] => {
    return [getBuyCollectibleStep(order, collectible)];
};

export const createDutchBuyCollectibleSteps = (
    order: SignedOrder,
    collectible: Collectible,
    wethTokenBalance: TokenBalance,
    priceInWeth: BigNumber,
): Step[] => {
    const steps: Step[] = [];

    // wrap ether
    const wethBalance = wethTokenBalance.balance;
    const deltaWeth = wethBalance.minus(priceInWeth);
    if (deltaWeth.isLessThan(0)) {
        steps.push({
            kind: StepKind.WrapEth,
            currentWethBalance: wethBalance,
            newWethBalance: priceInWeth,
            context: 'order',
        });
    }

    // unlock weth
    if (!wethTokenBalance.isUnlocked) {
        const unlockWethStep: StepToggleTokenLock = {
            kind: StepKind.ToggleTokenLock,
            token: wethTokenBalance.token,
            context: 'order',
            isUnlocked: false,
        };
        steps.push(unlockWethStep);
    }

    // buy collectible
    steps.push(getBuyCollectibleStep(order, collectible));

    return steps;
};

export const createBuySellMarketSteps = (
    baseToken: Token,
    quoteToken: Token,
    tokenBalances: TokenBalance[],
    wethTokenBalance: TokenBalance,
    weethTokenBalance: TokenBalance,
    webtcTokenBalance: TokenBalance,
    ethBalance: BigNumber,
    eethBalance: BigNumber,
    ebtcBalance: BigNumber,
    amount: BigNumber,
    side: OrderSide,
    price: BigNumber,
    takerFee: BigNumber,
): Step[] => {
    const buySellMarketFlow: Step[] = [];
    const isBuy = side === OrderSide.Buy;
    const tokenToUnlock = isBuy ? quoteToken : baseToken;

    const unlockTokenStep = getUnlockTokenStepIfNeeded(tokenToUnlock, tokenBalances, wethTokenBalance, weethTokenBalance, webtcTokenBalance);
    // Unlock token step should be added if it:
    // 1) it's a sell, or
    const isSell = unlockTokenStep && side === OrderSide.Sell;
    // 2) is a buy and
    // base token is not weth and is locked, or
    // base token is weth, is locked and there is not enouth plain ETH to fill the order

    let isBuyWithWethConditions = null;
    if (isWeth(tokenToUnlock.symbol)) {
        isBuyWithWethConditions =
            isBuy &&
            unlockTokenStep &&
            (!isWeth(tokenToUnlock.symbol) ||
                (isWeth(tokenToUnlock.symbol) && ethBalance.isLessThan(amount.multipliedBy(price))));
    }

    if (isWeeth(tokenToUnlock.symbol)) {
        isBuyWithWethConditions =
            isBuy &&
            unlockTokenStep &&
            (!isWeeth(tokenToUnlock.symbol) ||
                (isWeeth(tokenToUnlock.symbol) && eethBalance.isLessThan(amount.multipliedBy(price))));
    }

    if (isWebtc(tokenToUnlock.symbol)) {
        isBuyWithWethConditions =
            isBuy &&
            unlockTokenStep &&
            (!isWebtc(tokenToUnlock.symbol) ||
                (isWebtc(tokenToUnlock.symbol) && ebtcBalance.isLessThan(amount.multipliedBy(price))));
    }


    if (isSell || isBuyWithWethConditions) {
        buySellMarketFlow.push(unlockTokenStep as Step);
    }

    // unlock zrx (for fees) if the taker fee is positive
    if (!isZrx(tokenToUnlock.symbol) && takerFee.isGreaterThan(0)) {
        const unlockZrxStep = getUnlockZrxStepIfNeeded(tokenBalances);
        if (unlockZrxStep) {
            buySellMarketFlow.push(unlockZrxStep);
        }
    }

    // wrap the necessary ether if necessary
    if (isWeth(quoteToken.symbol)) {
        const wrapEthStep = getWrapEthStepIfNeeded(amount, price, side, wethTokenBalance, ethBalance);
        if (wrapEthStep) {
            buySellMarketFlow.push(wrapEthStep);
        }
    } else if (isWeeth(quoteToken.symbol)) {
        const wrapEethStep = getWrapEethStepIfNeeded(amount, price, side, weethTokenBalance, eethBalance);
        if (wrapEethStep) {
            buySellMarketFlow.push(wrapEethStep);
        }
    } else if (isWebtc(quoteToken.symbol)) {
        const wrapEethStep = getWrapEbtcStepIfNeeded(amount, price, side, webtcTokenBalance, ebtcBalance);
        if (wrapEethStep) {
            buySellMarketFlow.push(wrapEethStep);
        }
    }

    buySellMarketFlow.push({
        kind: StepKind.BuySellMarket,
        amount,
        side,
        token: baseToken,
    });
    return buySellMarketFlow;
};

export const getUnlockTokenStepIfNeeded = (
    token: Token,
    tokenBalances: TokenBalance[],
    wethTokenBalance: TokenBalance,
    weethTokenBalance: TokenBalance,
    webtcTokenBalance: TokenBalance,
): StepToggleTokenLock | null => {
    const tokenBalance: TokenBalance = isWeth(token.symbol)
        ? wethTokenBalance : isWeeth(token.symbol) ?
            weethTokenBalance : isWebtc(token.symbol) ?
                webtcTokenBalance
                : (tokenBalances.find(tb => tb.token.symbol === token.symbol) as TokenBalance);
    if (tokenBalance.isUnlocked) {
        return null;
    } else {
        return {
            kind: StepKind.ToggleTokenLock,
            token: tokenBalance.token,
            isUnlocked: false,
            context: 'order',
        };
    }
};

export const getUnlockCollectibleStep = (collectible: Collectible): StepUnlockCollectibles => {
    return {
        kind: StepKind.UnlockCollectibles,
        collectible,
        isUnlocked: false,
    };
};

export const getBuyCollectibleStep = (order: SignedOrder, collectible: Collectible): StepBuyCollectible => {
    return {
        kind: StepKind.BuyCollectible,
        order,
        collectible,
    };
};

export const getWrapEthStepIfNeeded = (
    amount: BigNumber,
    price: BigNumber,
    side: OrderSide,
    wethTokenBalance: TokenBalance,
    ethBalance?: BigNumber,
): StepWrapEth | null => {
    // Weth needed only when creating a buy order
    if (side === OrderSide.Sell) {
        return null;
    }

    const wethAmountNeeded = amount.multipliedBy(price);

    // If we have enough WETH, we don't need to wrap
    if (wethTokenBalance.balance.isGreaterThan(wethAmountNeeded)) {
        return null;
    }

    // Weth needed only if not enough plain ETH to use forwarder
    if (ethBalance && ethBalance.isGreaterThan(wethAmountNeeded)) {
        return null;
    }

    const wethBalance = wethTokenBalance.balance;
    const deltaWeth = wethBalance.minus(wethAmountNeeded);
    // Need to wrap eth only if weth balance is not enough
    if (deltaWeth.isLessThan(0)) {
        return {
            kind: StepKind.WrapEth,
            currentWethBalance: wethBalance,
            newWethBalance: wethAmountNeeded,
            context: 'order',
        };
    } else {
        return null;
    }
};

export const getWrapEethStepIfNeeded = (
    amount: BigNumber,
    price: BigNumber,
    side: OrderSide,
    weethTokenBalance: TokenBalance,
    eethBalance?: BigNumber,
): StepWrapEeth | null => {
    if (side === OrderSide.Sell) {
        return null;
    }

    const weethAmountNeeded = amount.multipliedBy(price);

    // If we have enough WETH, we don't need to wrap
    if (weethTokenBalance.balance.isGreaterThan(weethAmountNeeded)) {
        return null;
    }

    // Weth needed only if not enough plain ETH to use forwarder
    if (eethBalance && eethBalance.isGreaterThan(weethAmountNeeded)) {
        return null;
    }

    const weethBalance = weethTokenBalance.balance;
    const deltaWeth = weethBalance.minus(weethAmountNeeded);
    // Need to wrap eth only if weth balance is not enough
    if (deltaWeth.isLessThan(0)) {
        return {
            kind: StepKind.WrapEeth,
            currentWeethBalance: weethBalance,
            newWeethBalance: weethAmountNeeded,
            context: 'order',
        };
    } else {
        return null;
    }
};

export const getWrapEbtcStepIfNeeded = (
    amount: BigNumber,
    price: BigNumber,
    side: OrderSide,
    webtcTokenBalance: TokenBalance,
    ebtcBalance?: BigNumber,
): StepWrapEbtc | null => {
    if (side === OrderSide.Sell) {
        return null;
    }

    const webtcAmountNeeded = amount.multipliedBy(price);

    // If we have enough WETH, we don't need to wrap
    if (webtcTokenBalance.balance.isGreaterThan(webtcAmountNeeded)) {
        return null;
    }

    // Weth needed only if not enough plain ETH to use forwarder
    if (ebtcBalance && ebtcBalance.isGreaterThan(webtcAmountNeeded)) {
        return null;
    }

    const webtcBalance = webtcTokenBalance.balance;
    const deltaWeth = webtcBalance.minus(webtcAmountNeeded);
    // Need to wrap eth only if weth balance is not enough
    if (deltaWeth.isLessThan(0)) {
        return {
            kind: StepKind.WrapEbtc,
            currentWebtcBalance: webtcBalance,
            newWebtcBalance: webtcAmountNeeded,
            context: 'order',
        };
    } else {
        return null;
    }
};

export const getUnlockZrxStepIfNeeded = (tokenBalances: TokenBalance[]): StepToggleTokenLock | null => {
    const zrxTokenBalance: TokenBalance = tokenBalances.find(tokenBalance =>
        isZrx(tokenBalance.token.symbol),
    ) as TokenBalance;
    if (zrxTokenBalance.isUnlocked) {
        return null;
    } else {
        return {
            kind: StepKind.ToggleTokenLock,
            token: zrxTokenBalance.token,
            isUnlocked: false,
            context: 'order',
        };
    }
};
