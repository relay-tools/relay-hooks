import * as areEqual from 'fbjs/lib/areEqual';
import * as React from 'react';
import { Snapshot } from 'relay-runtime';
import { queryErrorsFieldQueryResponse } from './relay/queryErrorsFieldQuery.graphql';
import { useRelayEnvironment } from './RelayForm';
import { FormStateReturn } from './RelayFormsTypes';
import { operationQueryErrorsForm } from './Utils';

export const useFormState = (): FormStateReturn => {
    const ref = React.useRef<FormStateReturn>({
        errors: undefined,
        isValidating: false,
        isSubmitting: false,
        isValid: false,
    });

    const [, forceUpdate] = React.useState(ref.current);
    const environment = useRelayEnvironment();

    React.useEffect(() => {
        const snapshot = environment.lookup(operationQueryErrorsForm.fragment);
        function checkError(s: Snapshot): void {
            const data: queryErrorsFieldQueryResponse = (s as any).data;
            const entryErrors = data.form.entries.filter((value) => !!value.error);
            const entryValidated = data.form.entries.filter((value) => value.check === 'DONE');
            const errors = entryErrors.length > 0 ? entryErrors : undefined;

            const isValid =
                data.form.entries.length === entryValidated.length &&
                (!errors || Object.keys(errors).length === 0);
            if (
                !areEqual(ref.current.errors, errors) ||
                ref.current.isValid !== isValid ||
                ref.current.isValidating !== data.form.isValidating ||
                ref.current.isSubmitting !== data.form.isSubmitting
            ) {
                const newState = {
                    errors,
                    isValid,
                    isValidating: data.form.isValidating,
                    isSubmitting: data.form.isSubmitting,
                };
                ref.current = newState;
                forceUpdate(ref.current);
            }
        }
        checkError(snapshot);
        return environment.subscribe(snapshot, (s) => {
            checkError(s);
        }).dispose;
    }, [environment]);

    return ref.current;
};
