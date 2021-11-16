import * as React from 'react';
import { Snapshot, getSingularSelector, isPromise } from 'relay-runtime';
import FragmentField, { queryFieldFragment$data } from './relay/queryFieldFragment.graphql';
import { useRelayEnvironment } from './RelayForm';
import { FormSetValueOptions, FormSetValueReturn } from './RelayFormsTypes';
import { getFieldId, operationQueryForm, commitValue, commitErrorIntoRelay } from './Utils';

export function useFormSetValue<ValueType>({
    key,
    initialValue,
    validate,
    validateOnChange,
}: FormSetValueOptions<ValueType>): FormSetValueReturn<ValueType> {
    const [, forceUpdate] = React.useState(undefined);
    const environment = useRelayEnvironment();
    const ref = React.useRef({
        value: initialValue,
        error: undefined,
        touched: true,
        check: validate ? 'INIT' : 'DONE',
        isChecking: false,
    });

    const setValue = React.useCallback(
        (newValue) => {
            ref.current.value = newValue;
            ref.current.touched = true;
            commitValue(key, newValue, ref.current.check, environment, validate);
        },
        [environment, key, validate],
    );

    React.useEffect(() => {
        setValue(initialValue);
        const fragment = FragmentField;
        const item = {
            __fragmentOwner: operationQueryForm,
            __fragments: { queryFieldFragment: {} },
            __id: getFieldId(key),
        };
        const selector = getSingularSelector(fragment, item);
        const snapshot = environment.lookup(selector);

        const dispose = environment.subscribe(snapshot, (s: Snapshot) => {
            const data: queryFieldFragment$data = (s as any).data;
            const isStart = data.check === 'START';
            ref.current.check = data.check;
            if (!validate) {
                commitErrorIntoRelay(key, undefined, environment);
                return;
            }
            if (isStart && !ref.current.isChecking) {
                internalValidate(ref.current.value);
            }
        }).dispose;

        function finalizeCheck(error): void {
            ref.current.isChecking = false;
            ref.current.touched = false;
            if (ref.current.error !== error) {
                ref.current.error = error;
                forceUpdate(error);
            }
            commitErrorIntoRelay(key, error, environment);
        }

        function internalValidate(value): void {
            ref.current.isChecking = true;
            const result = validate(value);
            function internalFinalize(error): void {
                if (value !== ref.current.value) {
                    internalValidate(ref.current.value);
                    return;
                }
                finalizeCheck(error);
            }
            if (isPromise(result)) {
                (result as Promise<string | undefined>)
                    .then(internalFinalize)
                    .catch(internalFinalize);
            } else {
                internalFinalize(result);
            }
        }
        if (validateOnChange) {
            internalValidate(initialValue);
        }
        return dispose;
    }, [environment, initialValue, key, setValue, validate, validateOnChange]);

    return [ref.current, setValue];
}
