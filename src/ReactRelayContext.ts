/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

import * as React from 'react';
import { __internal } from 'relay-runtime';
import { RelayContext } from 'relay-runtime/lib/store/RelayStoreTypes';

const { createRelayContext } = __internal as any;

export const ReactRelayContext = createRelayContext(React) as React.Context<RelayContext | null>;
