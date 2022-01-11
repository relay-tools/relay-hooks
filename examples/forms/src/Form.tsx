import { Button } from '@material-ui/core';
import * as React from 'react';
import { TextField } from './TextField';
import { RelayEnvironmentProvider } from 'relay-hooks';
import { useFormSubmit, useFormState, useFormValue } from 'relay-hooks/lib/forms';
import { environment } from './relay';
import { useEffect } from 'react';
import { DropZoneField, DropZoneFieldType } from './DropZoneField';
import { InputDateField } from './InputDateField';

interface Values {
    firstName: string;
    lastName: string;
    email: string;
}

interface Props {
    onSubmit: (values: any) => void;
}

export const Form: React.FC<Props> = ({ onSubmit }) => {
    const [state, setState] = React.useState(undefined);
    useEffect(() => {
        console.log(
            'evn',
            environment
                .getStore()
                .getSource()
                .toJSON(),
        );
    });
    return !state ? (
        <RelayEnvironmentProvider environment={environment}>
            <FormInternal onSubmit={setState} />
        </RelayEnvironmentProvider>
    ) : (
        <div>SUBMIT :)</div>
    );
};

export const Errors: React.FC<any> = () => {
    const { errors, isValid } = useFormState();
    return (
        <div>
            <div>{'isValid: ' + isValid}</div>
            <div>{errors ? 'have errors' + JSON.stringify(errors) : ''}</div>
        </div>
    );
};

type FormSubmit = {
    firstName: string;
    uploadables: DropZoneFieldType;
    date: Date;
};

export const FormInternal: React.FC<any> = ({ onSubmit }) => {
    const data = useFormSubmit<FormSubmit>({
        onSubmit: (values) => {
            console.log('SUBMIT :)', values);

            onSubmit(values);
        },
    });

    const dataName = useFormValue<string>('firstName');

    return (
        <form onSubmit={data.submit} action="#">
            <div>
                <TextField fieldKey="firstName" placeholder="first name" />
            </div>
            <div>{JSON.stringify(dataName)}</div>
            <div>
                <DropZoneField fieldKey="uploadables" />
            </div>
            <div>
                <InputDateField fieldKey="date" />
            </div>
            <Errors />
            <Button onClick={data.validate}>validate</Button>
            <Button type="submit">submit</Button>
        </form>
    );
};
