import * as React from 'react';
import { useFormSetValue } from 'relay-hooks/lib/forms';

export type InputDateFieldType = Date | undefined;

export const InputDateField: React.FC<any> = ({ fieldKey }) => {
    const [, setValue] = useFormSetValue<InputDateFieldType>({
        key: fieldKey,
        initialValue: undefined,
    });

    return (
        <div className="form-group">
            <label>Input File</label>
            <input
                type="date"
                onChange={(e) => {
                    //if (file) reader.readAsDataURL(file);
                    setValue(e.target.valueAsDate ? e.target.valueAsDate : undefined);
                }}
            />
            ;
        </div>
    );
};
