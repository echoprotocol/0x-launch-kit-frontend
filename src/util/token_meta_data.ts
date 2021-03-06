import { NETWORK_ID, UI_DECIMALS_DISPLAYED_DEFAULT_PRECISION } from '../common/constants';
import { TokenMetaData } from '../common/tokens_meta_data';

import { Token } from './types';

export const getWethTokenFromTokensMetaDataByNetworkId = (tokensMetaData: TokenMetaData[]): Token => {
    const tokenMetaData = tokensMetaData.find(t => t.symbol === 'wecho');
    if (!tokenMetaData) {
        throw new Error('wecho Token MetaData not found');
    }
    return {
        address: tokenMetaData.addresses[NETWORK_ID],
        symbol: tokenMetaData.symbol,
        decimals: tokenMetaData.decimals,
        name: tokenMetaData.name,
        primaryColor: tokenMetaData.primaryColor,
        icon: tokenMetaData.icon,
        displayDecimals: tokenMetaData.displayDecimals || UI_DECIMALS_DISPLAYED_DEFAULT_PRECISION,
    };
};

export const getWeethTokenFromTokensMetaDataByNetworkId = (tokensMetaData: TokenMetaData[]): Token => {
    const tokenMetaData = tokensMetaData.find(t => t.symbol === 'weeth');
    if (!tokenMetaData) {
        throw new Error('wecho Token MetaData not found');
    }
    return {
        address: tokenMetaData.addresses[NETWORK_ID],
        symbol: tokenMetaData.symbol,
        decimals: tokenMetaData.decimals,
        name: tokenMetaData.name,
        primaryColor: tokenMetaData.primaryColor,
        icon: tokenMetaData.icon,
        displayDecimals: tokenMetaData.displayDecimals || UI_DECIMALS_DISPLAYED_DEFAULT_PRECISION,
        assetId: tokenMetaData.assetId,
    };
};

export const getWebtcTokenFromTokensMetaDataByNetworkId = (tokensMetaData: TokenMetaData[]): Token => {
    const tokenMetaData = tokensMetaData.find(t => t.symbol === 'webtc');
    if (!tokenMetaData) {
        throw new Error('wecho Token MetaData not found');
    }
    return {
        address: tokenMetaData.addresses[NETWORK_ID],
        symbol: tokenMetaData.symbol,
        decimals: tokenMetaData.decimals,
        name: tokenMetaData.name,
        primaryColor: tokenMetaData.primaryColor,
        icon: tokenMetaData.icon,
        displayDecimals: tokenMetaData.displayDecimals || UI_DECIMALS_DISPLAYED_DEFAULT_PRECISION,
        assetId: tokenMetaData.assetId,
    };
};

export const mapTokensMetaDataToTokenByNetworkId = (tokensMetaData: TokenMetaData[]): Token[] => {
    return tokensMetaData
        .filter(tokenMetaData => tokenMetaData.addresses[NETWORK_ID])
        .map(
            (tokenMetaData): Token => {
                return {
                    address: tokenMetaData.addresses[NETWORK_ID],
                    symbol: tokenMetaData.symbol,
                    decimals: tokenMetaData.decimals,
                    name: tokenMetaData.name,
                    primaryColor: tokenMetaData.primaryColor,
                    icon: tokenMetaData.icon,
                    displayDecimals: tokenMetaData.displayDecimals || UI_DECIMALS_DISPLAYED_DEFAULT_PRECISION,
                    assetId: tokenMetaData.assetId,
                };
            },
        );
};


