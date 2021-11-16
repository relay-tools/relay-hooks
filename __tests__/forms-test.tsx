/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { cleanup, fireEvent, render } from '@testing-library/react';
import * as React from 'react';
import { Form, getFieldError, HAVE_ERRORS, validateEmail, validateFirstName } from './forms';
jest.useRealTimers();

describe('relay-forms', () => {
    beforeEach(() => {});

    afterEach(async () => {
        cleanup();

        jest.clearAllMocks();
        jest.clearAllTimers();
        await Promise.resolve();
    });

    test('do again validation', async () => {
        const { queryByTestId, getByTestId } = render(<Form></Form>);
        const input = getByTestId('email') as HTMLInputElement;
        expect(getByTestId('email-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        fireEvent.change(input, { target: { value: '123' } });
        fireEvent.change(input, { target: { value: '12' } });
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('email-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        fireEvent.click(getByTestId('button-submit'));
        await Promise.resolve();
        expect(getByTestId('email-error').textContent).toBe(getFieldError('email', '12'));
        expect(getByTestId('email-count').textContent).toBe('2');
        expect(getByTestId('lastName-count').textContent).toBe('1');
    });

    test('show error in field', () => {
        const { queryByTestId, getByTestId } = render(<Form></Form>);
        const input = getByTestId('email') as HTMLInputElement;
        expect(getByTestId('email-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        fireEvent.change(input, { target: { value: '123' } });
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('email-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        fireEvent.click(getByTestId('button-submit'));
        expect(getByTestId('email-error').textContent).toBe(getFieldError('email', '123'));
        // refresh for isSubmitting
        expect(getByTestId('email-count').textContent).toBe('2');
        expect(getByTestId('lastName-count').textContent).toBe('1');
    });

    test('change error in field after submit', async () => {
        const { queryByTestId, getByTestId } = render(<Form></Form>);
        const input = getByTestId('email') as HTMLInputElement;

        fireEvent.change(input, { target: { value: '123' } });

        expect(validateEmail).not.toHaveBeenCalled();
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('email-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');

        fireEvent.click(getByTestId('button-submit'));
        await Promise.resolve(); //await promise validation;

        expect(validateEmail).toBeCalledTimes(1);
        expect(validateFirstName).toBeCalledTimes(1);
        expect(getByTestId('email-error').textContent).toBe(getFieldError('email', '123'));
        expect(getByTestId('errors').textContent).toBe(HAVE_ERRORS);
        expect(getByTestId('email-count').textContent).toBe('2');
        expect(getByTestId('lastName-count').textContent).toBe('1');

        fireEvent.change(input, { target: { value: '1234' } });

        expect(validateEmail).toBeCalledTimes(2);
        expect(validateFirstName).toBeCalledTimes(1);
        expect(getByTestId('email-count').textContent).toBe('3');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        expect(getByTestId('errors').textContent).toBe(HAVE_ERRORS);
        expect(getByTestId('email-error').textContent).toBe(getFieldError('email', '1234'));

        fireEvent.change(input, { target: { value: '12345' } });

        expect(validateEmail).toBeCalledTimes(3);
        expect(validateFirstName).toBeCalledTimes(1);
        expect(getByTestId('email-count').textContent).toBe('4');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('errors').textContent).toBe('');

        fireEvent.click(getByTestId('button-submit'));
        await Promise.resolve(); //await promise validation;

        expect(queryByTestId('submit-done').textContent).toBe('SUBMIT :)');
        expect(validateEmail).toBeCalledTimes(3);
        expect(validateFirstName).toBeCalledTimes(1);
    });

    test('submit', async () => {
        const { getByTestId, queryByTestId } = render(<Form></Form>);
        fireEvent.change(getByTestId('email'), { target: { value: 'email@try.it' } });
        fireEvent.change(getByTestId('firstName'), { target: { value: 'lorenzo' } });
        fireEvent.change(getByTestId('lastName'), { target: { value: 'di giacomo' } });
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('errors').textContent).toBe('');
        expect(queryByTestId('submit-done')).toBeNull();

        fireEvent.click(getByTestId('button-submit'));
        await Promise.resolve(); //await promise validation;

        expect(queryByTestId('submit-done').textContent).toBe('SUBMIT :)');
    });

    test('submit promise', async () => {
        const { getByTestId, queryByTestId } = render(<Form promise></Form>);
        fireEvent.change(getByTestId('email'), { target: { value: 'email@try.it' } });
        fireEvent.change(getByTestId('firstName'), { target: { value: 'lorenzo' } });
        fireEvent.change(getByTestId('lastName'), { target: { value: 'di giacomo' } });
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('errors').textContent).toBe('');
        expect(queryByTestId('submit-done')).toBeNull();

        fireEvent.click(getByTestId('button-submit'));
        await Promise.resolve(); //await promise validation;

        expect(queryByTestId('submit-done').textContent).toBe('SUBMIT :)');
    });

    test('show error in field only validate', async () => {
        const { queryByTestId, getByTestId } = render(<Form></Form>);
        const input = getByTestId('email') as HTMLInputElement;
        expect(getByTestId('email-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        fireEvent.change(input, { target: { value: '123' } });
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('email-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        fireEvent.click(getByTestId('button-validate'));
        await Promise.resolve(); //await promise validation;

        expect(getByTestId('email-error').textContent).toBe(getFieldError('email', '123'));
        // refresh for isSubmitting
        expect(getByTestId('email-count').textContent).toBe('2');
        expect(getByTestId('lastName-count').textContent).toBe('1');
    });

    test('manual validate & submit', async () => {
        const { getByTestId, queryByTestId } = render(<Form></Form>);
        fireEvent.change(getByTestId('email'), { target: { value: 'email@try.it' } });
        fireEvent.change(getByTestId('firstName'), { target: { value: 'lorenzo' } });
        fireEvent.change(getByTestId('lastName'), { target: { value: 'di giacomo' } });
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('errors').textContent).toBe('');
        expect(queryByTestId('submit-done')).toBeNull();

        fireEvent.click(getByTestId('button-validate'));
        expect(getByTestId('isSubmitting').textContent).toBe('false');
        expect(getByTestId('isValidating').textContent).toBe('true');
        await Promise.resolve(); //await promise validation;
        expect(getByTestId('isValidating').textContent).toBe('false');

        fireEvent.click(getByTestId('button-submit'));

        expect(queryByTestId('submit-done').textContent).toBe('SUBMIT :)');
    });

    test('submit isSubmitting', async () => {
        const { getByTestId, queryByTestId } = render(<Form promise></Form>);
        fireEvent.change(getByTestId('email'), { target: { value: 'email@try.it' } });
        fireEvent.change(getByTestId('firstName'), { target: { value: 'lorenzo' } });
        fireEvent.change(getByTestId('lastName'), { target: { value: 'di giacomo' } });
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('errors').textContent).toBe('');
        expect(queryByTestId('submit-done')).toBeNull();

        fireEvent.click(getByTestId('button-submit'));
        expect(getByTestId('isSubmitting').textContent).toBe('true');
        expect(getByTestId('isValidating').textContent).toBe('true');
        await Promise.resolve(); //await promise validation;
        expect(getByTestId('isValidating').textContent).toBe('false');
        expect(getByTestId('isSubmitting').textContent).toBe('true');

        await Promise.resolve(); //await promise submit;
        expect(getByTestId('isSubmitting').textContent).toBe('false');

        expect(queryByTestId('submit-done').textContent).toBe('SUBMIT :)');
    });

    test('show error in complex field', () => {
        const { queryByTestId, getByTestId } = render(<Form></Form>);
        const input = getByTestId('complex') as HTMLInputElement;
        expect(getByTestId('complex-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        fireEvent.change(input, { target: { value: '123' } });
        expect(queryByTestId('complex-error')).toBeNull();
        expect(getByTestId('complex-count').textContent).toBe('1');
        expect(getByTestId('lastName-count').textContent).toBe('1');
        fireEvent.click(getByTestId('button-submit'));
        expect(getByTestId('complex-error').textContent).toBe(getFieldError('complex', '123'));
        // refresh for isSubmitting
        expect(getByTestId('complex-count').textContent).toBe('2');
        expect(getByTestId('lastName-count').textContent).toBe('1');
    });

    test('submit complex field', async () => {
        let result;
        function onSubmit(values: any): void {
            result = values;
        }
        const { queryByTestId, getByTestId } = render(<Form jestOnSubmit={onSubmit}></Form>);

        fireEvent.change(getByTestId('email'), { target: { value: 'email@try.it' } });
        fireEvent.change(getByTestId('firstName'), { target: { value: 'lorenzo' } });
        fireEvent.change(getByTestId('lastName'), { target: { value: 'di giacomo' } });

        fireEvent.change(getByTestId('complex'), { target: { value: 'very complex' } });
        expect(queryByTestId('email-error')).toBeNull();
        expect(getByTestId('errors').textContent).toBe('');
        expect(queryByTestId('submit-done')).toBeNull();

        fireEvent.click(getByTestId('button-submit'));
        await Promise.resolve(); //await promise validation;

        expect(queryByTestId('submit-done').textContent).toBe('SUBMIT :)');
        expect(result).toEqual({
            firstName: 'lorenzo',
            lastName: 'di giacomo',
            email: 'email@try.it',
            complex: { test: 'very complex' },
        });
    });
});
