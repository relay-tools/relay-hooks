import React from 'react';
import { Form } from './Form';

const App = () => {
    return (
        <div style={{ textAlign: 'center' }}>
            <Form
                onSubmit={({ email, firstName, lastName }) => {
                    console.log(email, firstName, lastName);
                }}
            />
        </div>
    );
};

export default App;
