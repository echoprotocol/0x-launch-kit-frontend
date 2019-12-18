import { BigNumber } from '0x.js';
import React from 'react';
import { connect } from 'react-redux';

import {
    ETH_DECIMALS,
    STEP_MODAL_DONE_STATUS_VISIBILITY_TIME,
    UI_DECIMALS_DISPLAYED_ON_STEP_MODALS,
} from '../../../common/constants';
import {
    INSUFFICIENT_ETH_BALANCE_FOR_DEPOSIT,
    UNEXPECTED_ERROR,
    USER_DENIED_TRANSACTION_SIGNATURE_ERR,
} from '../../../exceptions/common';
import { ConvertBalanceMustNotBeEqualException } from '../../../exceptions/convert_balance_must_not_be_equal_exception';
import { InsufficientEthDepositBalanceException } from '../../../exceptions/insufficient_eth_deposit_balance_exception';
import { UserDeniedTransactionSignatureException } from '../../../exceptions/user_denied_transaction_exception';
import {
    convertBalanceStateAsync,
    stepsModalAdvanceStep,
    updateTokenBalances,
    updateWeethBalance,
} from '../../../store/actions';
import { getEstimatedTxTimeMs, getEETHBalance, getStepsModalCurrentStep } from '../../../store/selectors';
import { getKnownTokens } from '../../../util/known_tokens';
import { sleep } from '../../../util/sleep';
import { tokenAmountInUnits, tokenAmountInUnitsToBigNumber } from '../../../util/tokens';
import { StepWrapEeth, StoreState } from '../../../util/types';

import { BaseStepModal } from './base_step_modal';
import { StepItem } from './steps_progress';

interface OwnProps {
    buildStepsProgress: (currentStepItem: StepItem) => StepItem[];
}
interface StateProps {
    estimatedTxTimeMs: number;
    step: StepWrapEeth;
    eethBalance: BigNumber;
}

interface DispatchProps {
    updateWeeth: (newWethBalance: BigNumber) => Promise<any>;
    updateTokenBalances: (txHash: string) => Promise<any>;
    convertBalanceState: { request: () => void; success: () => void; failure: () => void };
    advanceStep: () => void;
}

type Props = OwnProps & StateProps & DispatchProps;

interface State {
    errorCaption: string;
}

class WrapEethStep extends React.Component<Props, State> {
    public state = {
        errorCaption: '',
    };

    public render = () => {
        const { buildStepsProgress, estimatedTxTimeMs, step } = this.props;

        const { context, currentWeethBalance, newWeethBalance } = step;
        const amount = newWeethBalance.minus(currentWeethBalance);
        const weethToken = getKnownTokens().getWeethToken();
        const eethAmount = tokenAmountInUnitsToBigNumber(amount.abs(), weethToken.decimals).toFixed(
            UI_DECIMALS_DISPLAYED_ON_STEP_MODALS,
        );

        const eethToWeeth = amount.isGreaterThan(0);
        const convertingFrom = eethToWeeth ? 'ECHO' : 'wECHO';
        const convertingTo = eethToWeeth ? 'wECHO' : 'ECHO';

        const isOrder = context === 'order';

        const buildMessage = (prefix: string) => {
            return [
                prefix,
                eethAmount,
                convertingFrom,
                isOrder ? 'for trading' : null, // only show "for trading" when creating an order
                `(${convertingFrom} to ${convertingTo}).`,
            ]
                .filter(x => x !== null)
                .join(' ');
        };

        const title = `Convert ${convertingFrom}`;

        const confirmCaption = `Confirm on Bridge to convert ${eethAmount} ${convertingFrom} into ${convertingTo}.`;
        const loadingCaption = buildMessage('Converting');
        const doneCaption = buildMessage('Converted');
        const loadingFooterCaption = `Waiting for confirmation....`;
        const doneFooterCaption = `${convertingFrom} converted!`;

        return (
            <BaseStepModal
                step={step}
                title={title}
                confirmCaption={confirmCaption}
                loadingCaption={loadingCaption}
                doneCaption={doneCaption}
                errorCaption={this.state.errorCaption}
                loadingFooterCaption={loadingFooterCaption}
                doneFooterCaption={doneFooterCaption}
                buildStepsProgress={buildStepsProgress}
                estimatedTxTimeMs={estimatedTxTimeMs}
                runAction={this._convertWeth}
                showPartialProgress={true}
            />
        );
    };

    private readonly _convertWeth = async ({ onLoading, onDone, onError }: any) => {
        const { step, advanceStep, eethBalance, updateWeeth, convertBalanceState } = this.props;
        const { currentWeethBalance, newWeethBalance } = step;
        const updateBalances = this.props.updateTokenBalances;
        try {
            const convertTxHash = await updateWeeth(newWeethBalance);
            onLoading();
            convertBalanceState.request();
            await updateBalances(convertTxHash);
            convertBalanceState.success();
            onDone();
            await sleep(STEP_MODAL_DONE_STATUS_VISIBILITY_TIME);
            advanceStep();
        } catch (err) {
            console.log('TCL: WrapEethStep -> privatereadonly_convertWeth -> err', err);
            let exception = err;
            let errorCaption = UNEXPECTED_ERROR;
            if (err.toString().includes(USER_DENIED_TRANSACTION_SIGNATURE_ERR)) {
                exception = new UserDeniedTransactionSignatureException();
                errorCaption = USER_DENIED_TRANSACTION_SIGNATURE_ERR;
            } else if (err.toString().includes(INSUFFICIENT_ETH_BALANCE_FOR_DEPOSIT)) {
                const amount = currentWeethBalance.isGreaterThanOrEqualTo(newWeethBalance)
                    ? currentWeethBalance.minus(newWeethBalance)
                    : newWeethBalance.minus(currentWeethBalance);
                const currentEthAmount = tokenAmountInUnits(eethBalance, ETH_DECIMALS);
                const ethNeeded = tokenAmountInUnits(amount, ETH_DECIMALS);
                exception = new InsufficientEthDepositBalanceException(currentEthAmount, ethNeeded);
                errorCaption = `You have ${currentEthAmount} ECHO but you need ${ethNeeded} ECHO to make this operation`;
            } else if (err instanceof ConvertBalanceMustNotBeEqualException) {
                exception = err;
                errorCaption =
                    'An unexpected error happened: tryed to wrap ECHO so that the resulting ECHO amount stays the same';
            }

            // Enable convert button: some conditions are dealt with exceptions and we don't
            // want to leave the button disabled
            convertBalanceState.success();

            this.setState({ errorCaption });
            onError(exception);
        }
    };
}

const mapStateToProps = (state: StoreState): StateProps => {
    return {
        estimatedTxTimeMs: getEstimatedTxTimeMs(state),
        step: getStepsModalCurrentStep(state) as StepWrapEeth,
        eethBalance: getEETHBalance(state),
    };
};

const WrapEethStepContainer = connect(
    mapStateToProps,
    (dispatch: any) => {
        return {
            updateWeeth: (newWethBalance: BigNumber) => dispatch(updateWeethBalance(newWethBalance)),
            updateTokenBalances: (txHash: string) => dispatch(updateTokenBalances(txHash)),
            advanceStep: () => dispatch(stepsModalAdvanceStep()),
            convertBalanceState: {
                request: () => dispatch(convertBalanceStateAsync.request()),
                success: () => dispatch(convertBalanceStateAsync.success()),
                failure: () => dispatch(convertBalanceStateAsync.failure()),
            },
        };
    },
)(WrapEethStep);

export { WrapEethStep, WrapEethStepContainer };
