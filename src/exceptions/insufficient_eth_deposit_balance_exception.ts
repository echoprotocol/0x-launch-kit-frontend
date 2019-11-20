export class InsufficientEthDepositBalanceException extends Error {
    constructor(ethBalance: string, ethAmountNeeded: string) {
        super(`You have ${ethBalance} ECHO but you need ${ethAmountNeeded} ECHO to make this operation`);
    }
}
