import * as React from 'react';
import { Snapshot, isPromise, IEnvironment } from 'relay-runtime';
import { queryFieldQueryResponse } from './relay/queryFieldQuery.graphql';
import { useRelayEnvironment } from './RelayForm';
import { FormSubmitOptions, FunctionOnSubmit, FormSubmitReturn } from './RelayFormsTypes';
import {
    commitValidateEndRelay,
    commitValidateIntoRelay,
    commitSubmitEndRelay,
    operationQueryForm,
} from './Utils';

function execute(
    environment: IEnvironment,
    snapshot: Snapshot,
    dispose: () => void,
    onSubmit?: FunctionOnSubmit<object>,
): void {
    const data: queryFieldQueryResponse = (snapshot as any).data;
    const filtered = data.form.entries.filter((value) => value.check === 'DONE');
    if (filtered.length === data.form.entries.length) {
        const errors = data.form.entries.filter((value) => !!value.error);
        commitValidateEndRelay(environment);
        if (onSubmit && (!errors || errors.length === 0)) {
            const result = {};
            data.form.entries.forEach((entry) => {
                result[entry.key] = entry.value;
            });
            const submit = onSubmit(result);
            if (isPromise(submit)) {
                (submit as Promise<void>).then(dispose).catch(dispose);
            } else {
                dispose();
            }
        } else {
            dispose();
        }
    }
}

export const useFormSubmit = <ValueType extends object = object>({
    onSubmit,
}: FormSubmitOptions<ValueType>): FormSubmitReturn => {
    const environment = useRelayEnvironment();
    const ref = React.useRef({
        isSubmitting: false,
        isValidating: false,
        error: undefined,
    });

    const internalValidate = React.useCallback(
        (snapshot: Snapshot, isSubmitting) => {
            ref.current.isValidating = true;
            const data: queryFieldQueryResponse = (snapshot as any).data;
            const filtered = data.form.entries.filter((value) => value.check === 'INIT');
            commitValidateIntoRelay(filtered, isSubmitting, environment);
        },
        [environment],
    );

    const validate = React.useCallback(() => {
        const snapshot = environment.lookup(operationQueryForm.fragment);
        if (ref.current.isValidating) {
            return;
        }
        let subscription = null;
        function dispose(): void {
            subscription && subscription.dispose();
            subscription = null;
            ref.current.isValidating = false;
        }
        subscription = environment.subscribe(snapshot, (s) => execute(environment, s, dispose));
        internalValidate(snapshot, false);
        execute(environment, snapshot, dispose);
    }, [environment, internalValidate]);

    const submit = React.useCallback(
        (event?: React.BaseSyntheticEvent<any>) => {
            if (event) {
                event.preventDefault();
            }

            if (ref.current.isSubmitting) {
                return;
            }
            let subscription = null;
            function dispose(): void {
                subscription && subscription.dispose();
                subscription = null;
                ref.current.isSubmitting = false;
                commitSubmitEndRelay(environment);
            }
            ref.current.isSubmitting = true;
            const snapshot = environment.lookup(operationQueryForm.fragment);

            subscription = environment.subscribe(snapshot, (s) =>
                execute(environment, s, dispose, onSubmit),
            );
            internalValidate(snapshot, true);
            execute(environment, snapshot, dispose, onSubmit);
        },
        [environment, internalValidate, onSubmit],
    );

    const result = React.useMemo(() => {
        return {
            submit,
            validate,
        };
    }, [submit, validate]);
    return result;
};
