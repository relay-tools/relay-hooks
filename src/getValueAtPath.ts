import * as invariant from 'fbjs/lib/invariant';

export function getValueAtPath(data: any, path: ReadonlyArray<string | number>): any {
    let result = data;
    for (const key of path) {
        if (result == null) {
            return null;
        }
        if (typeof key === 'number') {
            invariant(
                Array.isArray(result),
                'Relay: Expected an array when extracting value at path. ' +
                    "If you're seeing this, this is likely a bug in Relay.",
            );
            result = result[key];
        } else {
            invariant(
                typeof result === 'object' && !Array.isArray(result),
                'Relay: Expected an object when extracting value at path. ' +
                    "If you're seeing this, this is likely a bug in Relay.",
            );
            result = result[key];
        }
    }
    return result;
}
