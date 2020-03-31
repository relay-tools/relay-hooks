/**
 * @flow
 * @relayHash 6f6fbd8d622292a31e9ccc1b3df4c68a
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
    "kind": "LocalArgument",
    "name": "input",
    "type": "CreateEntryInput",
    "defaultValue": null
  }
],
v1 = [
  {
    "kind": "LinkedField",
    "alias": null,
    "name": "createEntry",
    "storageKey": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "CreateEntryPayload",
    "plural": false,
    "selections": [
      {
        "kind": "ScalarField",
        "alias": null,
        "name": "clientMutationId",
        "args": null,
        "storageKey": null
      },
      {
        "kind": "LinkedField",
        "alias": null,
        "name": "entry",
        "storageKey": null,
        "args": null,
        "concreteType": "Entry",
        "plural": false,
        "selections": [
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "id",
            "args": null,
            "storageKey": null
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "name": "text",
            "args": null,
            "storageKey": null
          }
        ]
      }
    ]
  }
];
return {
  "kind": "Request",
  "fragment": {
    "kind": "Fragment",
    "name": "createEntryMutation",
    "type": "Mutation",
    "metadata": null,
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "operation": {
    "kind": "Operation",
    "name": "createEntryMutation",
    "argumentDefinitions": (v0/*: any*/),
    "selections": (v1/*: any*/)
  },
  "params": {
    "operationKind": "mutation",
    "name": "createEntryMutation",
    "id": null,
    "text": "mutation createEntryMutation(\n  $input: CreateEntryInput\n) {\n  createEntry(input: $input) {\n    clientMutationId\n    entry {\n      id\n      text\n    }\n  }\n}\n",
    "metadata": {}
  }
};
})();
// prettier-ignore
(node/*: any*/).hash = 'ef10426e747a28840a2637abc763f2ab';

module.exports = node;
