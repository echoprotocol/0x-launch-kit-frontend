import { BigNumber, OrderStatus } from '0x.js';
import { createSelector } from 'reselect';

import { ERC20_APP_BASE_PATH } from '../common/constants';
import { isWeth, isWeeth, isWebtc } from '../util/known_tokens';
import {
    Collectible,
    MARKETPLACES,
    OrderBook,
    OrderSide,
    SearchTokenBalanceObject,
    StoreState,
    Token,
    TokenBalance,
    Web3State,
} from '../util/types';
import { mergeByPrice } from '../util/ui_orders';

export const getEchoAccountName = (state: StoreState) => state.blockchain.echoAccountName;
export const getEthAccount = (state: StoreState) => state.blockchain.ethAccount;
export const getTokenBalances = (state: StoreState) => state.blockchain.tokenBalances;
export const getWeb3State = (state: StoreState) => state.blockchain.web3State;
export const getEthBalance = (state: StoreState) => state.blockchain.ethBalance;
export const getEETHBalance = (state: StoreState) => state.blockchain.eethBalance;
export const getEBTCBalance = (state: StoreState) => state.blockchain.ebtcBalance;
export const getWethTokenBalance = (state: StoreState) => state.blockchain.wethTokenBalance;
export const getWeethTokenBalance = (state: StoreState) => state.blockchain.weethTokenBalance;
export const getWebtcTokenBalance = (state: StoreState) => state.blockchain.webtcTokenBalance;
export const getConvertBalanceState = (state: StoreState) => state.blockchain.convertBalanceState;
export const getWethBalance = (state: StoreState) =>
    state.blockchain.wethTokenBalance ? state.blockchain.wethTokenBalance.balance : new BigNumber(0);
export const getWeethBalance = (state: StoreState) =>
    state.blockchain.weethTokenBalance ? state.blockchain.weethTokenBalance.balance : new BigNumber(0);
export const getWebtcBalance = (state: StoreState) =>
    state.blockchain.webtcTokenBalance ? state.blockchain.webtcTokenBalance.balance : new BigNumber(0);
export const getOrders = (state: StoreState) => state.relayer.orders;
export const getUserOrders = (state: StoreState) => state.relayer.userOrders;
export const getOrderPriceSelected = (state: StoreState) => state.ui.orderPriceSelected;
export const getNotifications = (state: StoreState) => state.ui.notifications;
export const getHasUnreadNotifications = (state: StoreState) => state.ui.hasUnreadNotifications;
export const getStepsModalPendingSteps = (state: StoreState) => state.ui.stepsModal.pendingSteps;
export const getStepsModalDoneSteps = (state: StoreState) => state.ui.stepsModal.doneSteps;
export const getStepsModalCurrentStep = (state: StoreState) => state.ui.stepsModal.currentStep;
export const getCurrencyPair = (state: StoreState) => state.market.currencyPair;
export const getBaseToken = (state: StoreState) => state.market.baseToken;
export const getQuoteToken = (state: StoreState) => state.market.quoteToken;
export const getMarkets = (state: StoreState) => state.market.markets;
export const getEthInUsd = (state: StoreState) => state.market.ethInUsd;
export const getGasPriceInWei = (state: StoreState) => state.blockchain.gasInfo.gasPriceInWei;
export const getEstimatedTxTimeMs = (state: StoreState) => state.blockchain.gasInfo.estimatedTimeMs;
export const getAllCollectibles = (state: StoreState) => state.collectibles.allCollectibles;
export const getAllCollectiblesFetchStatus = (state: StoreState) => state.collectibles.allCollectiblesFetchStatus;
export const getCollectibleById = (state: StoreState, props: { collectibleId: string }): Collectible | undefined =>
    state.collectibles.allCollectibles[props.collectibleId];
export const getSelectedCollectible = (state: StoreState) => state.collectibles.collectibleSelected;
export const getCurrentRoutePath = (state: StoreState) => state.router.location.pathname;
export const getRouterLocationSearch = (state: StoreState) => state.router.location.search;

export const getCurrentMarketPlace = createSelector(
    getCurrentRoutePath,
    (currentRoute: string) => (currentRoute.includes(ERC20_APP_BASE_PATH) ? MARKETPLACES.ERC20 : MARKETPLACES.ERC721),
);

const searchToken = ({ tokenBalances, wethTokenBalance, weethTokenBalance, webtcTokenBalance, tokenToFind}: SearchTokenBalanceObject) => {
    if (tokenToFind && isWeth(tokenToFind.symbol)) {
        return wethTokenBalance;
    }

    if (tokenToFind && isWeeth(tokenToFind.symbol)) {
        return weethTokenBalance;
    }

    if (tokenToFind && isWebtc(tokenToFind.symbol)) {
        return webtcTokenBalance;
    }
    return (
        tokenBalances.find(
            (tokenBalance: TokenBalance) => tokenBalance.token.symbol === (tokenToFind && tokenToFind.symbol),
        ) || null
    );
};

export const getTotalEthBalance = createSelector(
    getEthBalance,
    getWethBalance,
    (ethBalance: BigNumber, wethTokenBalance: BigNumber) => ethBalance.plus(wethTokenBalance),
);

export const getBaseTokenBalance = createSelector(
    getTokenBalances,
    getWethTokenBalance,
    getWeethTokenBalance,
    getWebtcTokenBalance,
    getBaseToken,
    (tokenBalances: TokenBalance[], wethTokenBalance: TokenBalance | null, weethTokenBalance: TokenBalance | null, webtcTokenBalance: TokenBalance | null, baseToken: Token | null) =>
        searchToken({ tokenBalances, wethTokenBalance, weethTokenBalance, webtcTokenBalance, tokenToFind: baseToken }),
);

export const getQuoteTokenBalance = createSelector(
    getTokenBalances,
    getWethTokenBalance,
    getWeethTokenBalance,
    getWebtcTokenBalance,
     getQuoteToken,
    (tokenBalances: TokenBalance[], wethTokenBalance: TokenBalance | null, weethTokenBalance: TokenBalance | null, webtcTokenBalance: TokenBalance | null, quoteToken: Token | null) =>
        searchToken({ tokenBalances, wethTokenBalance, weethTokenBalance, webtcTokenBalance, tokenToFind: quoteToken }),
);

export const getOpenOrders = createSelector(
    getOrders,
    getWeb3State,
    (orders, web3State) => {
        switch (web3State) {
            case Web3State.NotInstalled:
            case Web3State.Error:
            case Web3State.Locked: {
                return orders;
            }
            default: {
                return orders.filter(order => order.status === OrderStatus.Fillable);
            }
        }
    },
);

export const getOpenSellOrders = createSelector(
    getOpenOrders,
    orders => {
        return orders.filter(order => order.side === OrderSide.Sell).sort((o1, o2) => o2.price.comparedTo(o1.price));
    },
);

export const getOpenBuyOrders = createSelector(
    getOpenOrders,
    orders => {
        return orders.filter(order => order.side === OrderSide.Buy).sort((o1, o2) => o2.price.comparedTo(o1.price));
    },
);

export const getMySizeOrders = createSelector(
    getUserOrders,
    userOrders => {
        return userOrders
            .filter(userOrder => userOrder.status === OrderStatus.Fillable)
            .map(order => {
                let newSize = order.size;
                if (order.filled) {
                    newSize = order.size.minus(order.filled);
                }
                return {
                    size: newSize,
                    side: order.side,
                    price: order.price,
                };
            });
    },
);

export const getSpread = createSelector(
    getOpenBuyOrders,
    getOpenSellOrders,
    (buyOrders, sellOrders) => {
        if (!buyOrders.length || !sellOrders.length) {
            return new BigNumber(0);
        }

        const lowestPriceSell = sellOrders[sellOrders.length - 1].price;
        const highestPriceBuy = buyOrders[0].price;

        return lowestPriceSell.minus(highestPriceBuy);
    },
);

export const getSpreadInPercentage = createSelector(
    getSpread,
    getOpenSellOrders,
    (absSpread, sellOrders) => {
        if (!sellOrders.length) {
            return new BigNumber(0);
        }

        const lowestPriceSell = sellOrders[sellOrders.length - 1].price;
        return absSpread.dividedBy(lowestPriceSell).multipliedBy(100);
    },
);

export const getOrderBook = createSelector(
    getOpenSellOrders,
    getOpenBuyOrders,
    getMySizeOrders,
    (sellOrders, buyOrders, mySizeOrders): OrderBook => {
        const orderBook = {
            sellOrders: mergeByPrice(sellOrders),
            buyOrders: mergeByPrice(buyOrders),
            mySizeOrders,
        };
        return orderBook;
    },
);

export const getTokens = createSelector(
    getTokenBalances,
    (tokenBalances): Token[] => {
        return tokenBalances.map((tokenBalance, index) => {
            const { token } = tokenBalance;
            return token;
        });
    },
);

export const getUserCollectibles = createSelector(
    getEthAccount,
    getAllCollectibles,
    (ethAccount, allCollectibles): { [key: string]: Collectible } => {
        const userCollectibles: { [key: string]: Collectible } = {};
        Object.keys(allCollectibles).forEach(tokenId => {
            if (allCollectibles[tokenId].currentOwner.toLowerCase() === ethAccount.toLowerCase()) {
                userCollectibles[tokenId] = allCollectibles[tokenId];
            }
        });
        return userCollectibles;
    },
);

export const getUserCollectiblesAvailableToSell = createSelector(
    getUserCollectibles,
    (userCollectibles): { [key: string]: Collectible } => {
        const userCollectiblesAvailableToSell: { [key: string]: Collectible } = {};
        Object.keys(userCollectibles).forEach(tokenId => {
            const collectibleIterator = userCollectibles[tokenId];
            if (collectibleIterator.order === null) {
                userCollectiblesAvailableToSell[tokenId] = collectibleIterator;
            }
        });
        return userCollectiblesAvailableToSell;
    },
);

export const getUserCollectiblesOnSell = createSelector(
    getUserCollectibles,
    (userCollectibles): { [key: string]: Collectible } => {
        const userCollectiblesOnSell: { [key: string]: Collectible } = {};
        Object.keys(userCollectibles).forEach(tokenId => {
            const collectibleIterator = userCollectibles[tokenId];
            if (collectibleIterator.order) {
                userCollectiblesOnSell[tokenId] = collectibleIterator;
            }
        });
        return userCollectiblesOnSell;
    },
);

export const getOtherUsersCollectibles = createSelector(
    getEthAccount,
    getAllCollectibles,
    (ethAccount, allCollectibles): { [key: string]: Collectible } => {
        const userCollectibles: { [key: string]: Collectible } = {};
        Object.keys(allCollectibles).forEach(tokenId => {
            if (allCollectibles[tokenId].currentOwner.toLowerCase() !== ethAccount.toLowerCase()) {
                userCollectibles[tokenId] = allCollectibles[tokenId];
            }
        });
        return userCollectibles;
    },
);

export const getUsersCollectiblesAvailableToList = createSelector(
    getOtherUsersCollectibles,
    getUserCollectiblesOnSell,
    (otherUsersCollectibles, userCollectiblesOnSell): { [key: string]: Collectible } => {
        return { ...otherUsersCollectibles, ...userCollectiblesOnSell };
    },
);
