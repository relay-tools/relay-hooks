import * as React from 'react';
import { TextField as TextFieldMUI } from '@material-ui/core';
import { useFormSetValue } from 'relay-hooks/lib/forms';
import { useCallback } from 'react';
/*
import * as Yup from 'yup';

function fieldValidate(value: any, validate: (value: any) => Promise<any>): Promise<any> {
    return validate(value)
        .then((error) => {
            console.log('value', value);
        })
        .catch((yupError) => {
            if (yupError.name === 'ValidationError') {
                console.log('yupError message', yupError.message);
            }
        });
}
*/

/*
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function validate(value: any) {
    console.log('check forms');
    await sleep(500);
    if (value && value > 100) {
        return 'lunghezza errata ' + value;
    }
    return undefined;
}
*/

function validate(value: string) {
    if (value && value.length < 5) {
        return ' wrong length, minimum 5 current ' + value;
    }
    return undefined;
}

type TextFieldProps = {
    placeholder: string;
    fieldKey: string;
    initialValue?: string;
};

export const TextField: React.FC<TextFieldProps> = ({ placeholder, fieldKey, initialValue }) => {
    const [{ error }, setValue] = useFormSetValue({
        key: fieldKey,
        validate,
        initialValue,
        validateOnChange: true,
    });

    const setValueCallback = useCallback(
        (event) => {
            const value = event.target.value;
            setValue(value);
        },
        [setValue],
    );

    return (
        <>
            {error && <div>{error}</div>}
            <TextFieldMUI
                defaultValue={initialValue}
                placeholder={placeholder}
                onChange={(value) => setValueCallback(value)}
            />
        </>
    );
};
