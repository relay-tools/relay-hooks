import CircularProgress from '@material-ui/core/CircularProgress';
import { useRouter } from 'next/router';
import React, { useMemo } from 'react';
import { useQuery, STORE_OR_NETWORK } from 'relay-hooks';
import styled from 'styled-components';
import { TodoAppQuery } from '../__generated__/relay/TodoAppQuery.graphql';
import { QUERY_APP, TodoApp } from '../components/TodoApp';
import { withData } from '../relay';
import { Header } from './Header';

const StyledDiv = styled.div`
    align-items: center;
    width: 100%;
    height: 400px;
    justify-content: center;
    display: flex;
    flex: 1;
`;

const StyledHeader = styled.header`
    h1 {
        width: 100%;
        font-size: 100px;
        font-weight: 100;
        text-align: center;
        color: rgba(175, 47, 47, 0.15);
        -webkit-text-rendering: optimizeLegibility;
        -moz-text-rendering: optimizeLegibility;
        text-rendering: optimizeLegibility;
    }
`;
const StyledSection = styled.section`
    flex: 1;
    background: #fff;
    margin: 0px 0 40px 0;
    position: relative;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
    min-height: 400px;
`;

const RootPage = ({ query, first }: any): JSX.Element => {
    const router = useRouter();
    const userId = router.query && router.query.userId ? (router.query.userId as string) : 'me';

    const queryVariables = useMemo(() => {
        return {
            first,
            userId,
        };
    }, [first, userId]);

    const { error, data, retry, isLoading } = useQuery<TodoAppQuery>(query, queryVariables, {
        fetchPolicy: STORE_OR_NETWORK,
    });

    return (
        <React.Fragment>
            <Header />

            <StyledHeader>
                <h1>todos</h1>
            </StyledHeader>

            <StyledSection>
                {data ? (
                    <TodoApp query={data} retry={retry} isLoading={isLoading} />
                ) : error ? (
                    <div>{error.message}</div>
                ) : (
                    <StyledDiv>
                        <CircularProgress size={60} />
                    </StyledDiv>
                )}
            </StyledSection>
        </React.Fragment>
    );
};

export const createRootPage = (first: number): any =>
    withData(RootPage, {
        query: QUERY_APP,
        first,
    });
