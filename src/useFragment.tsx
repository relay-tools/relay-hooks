import useOssFragment from './useOssFragment';

const useFragment = function(fragmentDef, fragmentRef: any): any {
    const [data] = useOssFragment(fragmentDef, fragmentRef);

    return data;
};

export default useFragment;
