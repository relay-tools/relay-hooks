import React from 'react';
import { useFragment } from 'relay-hooks';
import graphql from 'babel-plugin-relay/macro';

const fragmentSpec = graphql`
    fragment Entries_entries on Entry @relay(plural: true) {
        id
        text
    }
`;

const Entries = (props) => {
    const entries = useFragment(fragmentSpec, props.entries);
    //const {entries} = props;
    return entries.map((entry) => (
        <div key={entry.id}>
            <span>
                {entry.id} : {entry.text}
            </span>
        </div>
    ));
};
/*export default createFragmentContainer(Entries, {
  // This `list` fragment corresponds to the prop named `list` that is
  // expected to be populated with server data by the `<TodoList>` component.
  entries: fragmentSpec,
});*/
export default Entries;
