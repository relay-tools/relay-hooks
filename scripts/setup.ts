import * as Promise from 'promise-polyfill';
import * as React from 'react';
global.Promise = Promise;
React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED =
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;
