/* eslint-disable @typescript-eslint/camelcase */
import { graphql, readInlineData } from 'relay-runtime';

import { ReadInlineUser_user } from '../__generated__/relay/ReadInlineUser_user.graphql';
const fragmentNode = graphql`
    fragment ReadInlineUser_user on User @inline {
        id
        userId
        totalCount
        completedCount
    }
`;

// non-React function called from React
export function getUser(userRef): ReadInlineUser_user {
    return readInlineData<ReadInlineUser_user>(fragmentNode, userRef);
}
