import {
    commitLocalUpdate,
    createOperationDescriptor,
    IEnvironment,
    ROOT_ID,
    RecordSource,
    ID_KEY,
} from 'relay-runtime';
import QueryErrorsField from './relay/queryErrorsFieldQuery.graphql';
import QueryField from './relay/queryFieldQuery.graphql';

const PREFIX_LOCAL_FORM = 'local:form';

export function getFieldId(key): string {
    return PREFIX_LOCAL_FORM + '.' + key;
}

export const initialCommit = (environment: IEnvironment): void => {
    commitLocalUpdate(environment, (store) => {
        const exists = !!store.get(PREFIX_LOCAL_FORM);

        if (!exists) {
            const localForm = store.create(PREFIX_LOCAL_FORM, 'EntryForm');
            localForm.setLinkedRecords([], 'entries');
            const root = store.get(ROOT_ID) || store.getRoot();
            root.setLinkedRecord(localForm, 'form');
        }
    });
};

export const commitValidateIntoRelay = (entries, isSubmitting, environment): void => {
    commitLocalUpdate(environment, (store) => {
        const form = store.get(PREFIX_LOCAL_FORM);
        form.setValue(isSubmitting, 'isSubmitting');
        form.setValue(true, 'isValidating');
        entries.forEach((entry) => store.get(getFieldId(entry.key)).setValue('START', 'check'));
    });
};

export const commitSubmitEndRelay = (environment): void => {
    commitLocalUpdate(environment, (store) => {
        store.get(PREFIX_LOCAL_FORM) &&
            store.get(PREFIX_LOCAL_FORM).setValue(false, 'isSubmitting');
    });
};

export const commitValidateEndRelay = (environment): void => {
    commitLocalUpdate(environment, (store) => {
        store.get(PREFIX_LOCAL_FORM) &&
            store.get(PREFIX_LOCAL_FORM).setValue(false, 'isValidating');
    });
};

export const commitValue = (key, value, check, environment, validate): void => {
    const id = getFieldId(key);
    commitLocalUpdate(environment, (store) => {
        const localForm = store.get(PREFIX_LOCAL_FORM);
        if (!store.get(id)) {
            const root = store.create(id, 'Entry');
            root.setValue(id, 'id');
            root.setValue(key, 'key');
            root.setValue(validate ? 'INIT' : 'DONE', 'check');
            const entriesArray = localForm.getLinkedRecords('entries') || [];
            entriesArray.push(root);
            localForm.setLinkedRecords(entriesArray, 'entries');
        }
    });

    const field = {
        [ID_KEY]: id,
        value,
        __typename: 'Entry',
    } as any;
    const source = new RecordSource();
    if (check === 'DONE' && validate) {
        field.check = 'START';
    }
    source.set(id, field);
    environment._publishQueue.commitSource(source);
    environment._publishQueue.run();
};

export const commitErrorIntoRelay = (key, error, environment): void => {
    commitLocalUpdate(environment, (store) => {
        const root = store.get(getFieldId(key));
        root.setValue(error, 'error');
        root.setValue('DONE', 'check');
    });
};

export const operationQueryForm = createOperationDescriptor(QueryField, {});

export const operationQueryErrorsForm = createOperationDescriptor(QueryErrorsField, {});
