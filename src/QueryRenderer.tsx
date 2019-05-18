import * as React from 'react';
import { ReactRelayContext } from 'react-relay';
import { Props } from 'relay-runtime/lib/RelayStoreTypes';
import { UseQueryProps } from './RelayHooksType';
import useQuery from './useQuery';




export type RenderProps = {
    error: Error,
    props: Object,
    retry: () => void,
    cached?: boolean
};

export interface Props extends UseQueryProps {
    render: (renderProps: RenderProps) => React.ReactNode,
};


const QueryRenderer = function (props: Props)  {
    const {render, ...others} = props;
    const hooksProps = useQuery(others);

    return <ReactRelayContext.Provider value={hooksProps.relayContext}>
        {render(hooksProps.renderProps)}
    </ReactRelayContext.Provider>

}



export default QueryRenderer;