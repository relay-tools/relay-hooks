/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+relay
 * @flow strict-local
 * @format
 */

// flowlint ambiguous-object-type:error

'use strict';

import * as invariant from 'fbjs/lib/invariant';

import { ConcreteRequest, ReaderFragment, ReaderPaginationMetadata } from 'relay-runtime';
import { getRefetchMetadata } from './getRefetchMetadata';

export function getPaginationMetadata(
    fragmentNode: ReaderFragment,
    componentDisplayName: string,
): {
    connectionPathInFragmentData: ReadonlyArray<string | number>;
    identifierField: string | null;
    paginationRequest: ConcreteRequest;
    paginationMetadata: ReaderPaginationMetadata;
    stream: boolean;
} {
    const { refetchableRequest: paginationRequest, refetchMetadata } = getRefetchMetadata(
        fragmentNode,
        componentDisplayName,
    );

    const paginationMetadata = refetchMetadata.connection;
    invariant(
        paginationMetadata != null,
        'Relay: getPaginationMetadata(): Expected fragment `%s` to include a ' +
            'connection when using `%s`. Did you forget to add a @connection ' +
            'directive to the connection field in the fragment?',
        componentDisplayName,
        fragmentNode.name,
    );
    const connectionPathInFragmentData = paginationMetadata.path;

    const connectionMetadata = (fragmentNode.metadata?.connection ?? [])[0];
    invariant(
        connectionMetadata != null,
        'Relay: getPaginationMetadata(): Expected fragment `%s` to include a ' +
            'connection when using `%s`. Did you forget to add a @connection ' +
            'directive to the connection field in the fragment?',
        componentDisplayName,
        fragmentNode.name,
    );
    const identifierField = refetchMetadata.identifierField;
    invariant(
        identifierField == null || typeof identifierField === 'string',
        'Relay: getRefetchMetadata(): Expected `identifierField` to be a string.',
    );
    return {
        connectionPathInFragmentData,
        identifierField,
        paginationRequest,
        paginationMetadata,
        stream: connectionMetadata.stream === true,
    };
}
