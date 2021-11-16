/* eslint-disable @typescript-eslint/no-unused-vars */
import { graphql } from 'relay-runtime';

const QueryField = graphql`
    query queryFieldQuery {
        form {
            entries {
                id
                key
                value
                check
                error
            }
        }
    }
`;

const QueryErrorsField = graphql`
    query queryErrorsFieldQuery {
        form {
            isSubmitting
            isValidating
            entries {
                id
                key
                error
                check
            }
        }
    }
`;

const FragmentField = graphql`
    fragment queryFieldFragment on Entry {
        id
        check
    }
`;

const FragmentValueField = graphql`
    fragment queryValueFieldFragment on Entry {
        id
        value
        error
    }
`;
