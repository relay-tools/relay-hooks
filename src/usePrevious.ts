import { useEffect, useRef } from "react";
import * as ReactRelayQueryFetcher from 'react-relay/lib/ReactRelayQueryFetcher';

const usePrevious = function usePrevious(value): any {
    const ref = useRef();
    if (ref.current === null || ref.current === undefined) {
        const c:any = {queryFetcher: new ReactRelayQueryFetcher()};
        ref.current = c;
    }
    useEffect(() => {
      value.queryFetcher = (ref.current as any).queryFetcher;
      ref.current = value;
    });
    return ref.current;
  }

export default usePrevious;