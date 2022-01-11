import * as React from 'react';
import Dropzone from 'react-dropzone';
import { useFormSetValue } from 'relay-hooks/lib/forms';

export type DropZoneFieldType = { files: File[] } | undefined;

export const DropZoneField: React.FC<any> = ({ fieldKey }) => {
    const [, setValue] = useFormSetValue<DropZoneFieldType>({
        key: fieldKey,
        initialValue: undefined,
    });

    return (
        <div className="form-group">
            <label>Multiple files</label>
            <Dropzone
                onDrop={(files) =>
                    setValue({
                        files,
                    })
                }
            >
                {({ getRootProps, getInputProps }) => (
                    <div {...getRootProps()}>
                        <input {...getInputProps()} />
                        Click me to upload a file!
                    </div>
                )}
            </Dropzone>
        </div>
    );
};
