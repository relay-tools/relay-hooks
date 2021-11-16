/* tslint:disable */
/* eslint-disable */

import { ReaderFragment } from "relay-runtime";
import { FragmentRefs } from "relay-runtime";
export type queryFieldFragment = {
    readonly id: string;
    readonly check: string | null;
    readonly " $refType": "queryFieldFragment";
};
export type queryFieldFragment$data = queryFieldFragment;
export type queryFieldFragment$key = {
    readonly " $data"?: queryFieldFragment$data;
    readonly " $fragmentRefs": FragmentRefs<"queryFieldFragment">;
};



const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "queryFieldFragment",
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
      "name": "check",
      "storageKey": null
    }
  ],
  "type": "Entry",
  "abstractKey": null
};
(node as any).hash = 'd5b0953bdeb412925ee13444a6be6082';
export default node;
