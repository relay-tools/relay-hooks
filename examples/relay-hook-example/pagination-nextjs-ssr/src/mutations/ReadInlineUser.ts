/* eslint-disable @typescript-eslint/camelcase */
import { graphql, readInlineData } from 'relay-runtime';

import {
    ReadInlineUser_user$data,
    ReadInlineUser_user$key,
} from '../__generated__/relay/ReadInlineUser_user.graphql';
const fragmentNode = graphql`
    fragment ReadInlineUser_user on User @inline {
        id
        userId
        totalCount
        completedCount
    }
`;

// non-React function called from React
export function getUser(userRef: ReadInlineUser_user$key): ReadInlineUser_user$data {
    return readInlineData(fragmentNode, userRef);
}
