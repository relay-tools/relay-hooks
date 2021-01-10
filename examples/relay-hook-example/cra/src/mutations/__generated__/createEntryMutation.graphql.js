/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ConcreteRequest } from 'relay-runtime';
export type CreateEntryInput = {|
  clientMutationId?: ?string,
  id: string,
  text: string,
|};
export type createEntryMutationVariables = {|
  input?: ?CreateEntryInput
|};
export type createEntryMutationResponse = {|
  +createEntry: ?{|
    +clientMutationId: ?string,
    +entry: ?{|
      +id: string,
      +text: ?string,
    |},
  |}
|};
export type createEntryMutation = {|
  variables: createEntryMutationVariables,
  response: createEntryMutationResponse,
|};
*/


/*
mutation createEntryMutation(
  $input: CreateEntryInput
) {
  createEntry(input: $input) {
    clientMutationId
    entry {
      id
      text
    }
  }
}
*/

const node/*: ConcreteRequest*/ = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "CreateEntryPayload",
    "kind": "LinkedField",
    "name": "createEntry",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "clientMutationId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "Entry",
        "kind": "LinkedField",
        "name": "entry",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "text",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "createEntryMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "createEntryMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "3cfd3445232200a70982ffe9d8bfae5d",
    "id": null,
    "metadata": {},
    "name": "createEntryMutation",
    "operationKind": "mutation",
    "text": "mutation createEntryMutation(\n  $input: CreateEntryInput\n) {\n  createEntry(input: $input) {\n    clientMutationId\n    entry {\n      id\n      text\n    }\n  }\n}\n"
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'ef10426e747a28840a2637abc763f2ab';

module.exports = node;
