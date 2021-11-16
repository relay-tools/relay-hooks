export type FunctionOnSubmit<ValueType> = (values: ValueType) => Promise<void> | void;

export type FormSubmitOptions<ValueType> = {
    onSubmit: FunctionOnSubmit<ValueType>;
};

export type FormSubmitReturn = {
    submit: (event?: React.BaseSyntheticEvent<any, any, any>) => void;
    validate: () => void;
};

export type FormSetValueOptions<ValueType> = {
    key: string;
    initialValue?: ValueType;
    validate?: (value: ValueType) => Promise<string | undefined> | string | undefined;
    validateOnChange?: boolean;
};

export type FormSetValueStateReturn = {
    error: undefined | null | Error;
};

export type FormValueStateReturn<ValueType> = {
    readonly id: string;
    readonly value: ValueType | null;
    readonly error: string | null;
};

export type FormSetValueFunctionReturn<ValueType> = (newValue: ValueType) => void;

export type FormSetValueReturn<ValueType> = [
    FormSetValueStateReturn,
    FormSetValueFunctionReturn<ValueType>,
];

export type FormStateReturn = {
    errors: ReadonlyArray<
        | {
              readonly id: string;
              readonly key: string;
              readonly error: string | null;
          }
        | null
        | undefined
    >;
    isValidating: boolean;
    isSubmitting: boolean;
    isValid: boolean;
};
