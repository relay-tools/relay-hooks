import * as ReactTestRenderer from 'react-test-renderer';

export function instanceAct(instance, props) {
    ReactTestRenderer.act(() => {
        instance.getInstance().setProps(props);
    });
}

export function createHooks(component, options?: any) {
    let result;
    ReactTestRenderer.act(() => {
        result = ReactTestRenderer.create(component, options);
        jest.runAllImmediates();
    });
    return result;
}

export function envResolveAct(environment, query, response) {
    ReactTestRenderer.act(() => {
        environment.mock.resolve(query, response);
    });
}
