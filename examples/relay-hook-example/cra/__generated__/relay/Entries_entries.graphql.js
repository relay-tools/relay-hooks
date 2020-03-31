/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type Entries_entries$ref: FragmentReference;
declare export opaque type Entries_entries$fragmentType: Entries_entries$ref;
export type Entries_entries = $ReadOnlyArray<{|
  +id: string,
  +text: ?string,
  +$refType: Entries_entries$ref,
|}>;
export type Entries_entries$data = Entries_entries;
export type Entries_entries$key = $ReadOnlyArray<{
  +$data?: Entries_entries$data,
  +$fragmentRefs: Entries_entries$ref,
  ...
}>;
*/


const node/*: ReaderFragment*/ = {
  "kind": "Fragment",
  "name": "Entries_entries",
  "type": "Entry",
  "metadata": {
    "plural": true
  },
  "argumentDefinitions": [],
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
};
// prettier-ignore
(node/*: any*/).hash = 'ccd643d090e21ec668dc0b2947383e70';

module.exports = node;
