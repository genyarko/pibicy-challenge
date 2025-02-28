// TextInput.js
import React from 'react';

const TextInput = ({ position, value, onChange, onSubmit }) => (
    <div
        style={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            zIndex: 9999,
            backgroundColor: 'white',
            border: '1px solid gray',
            padding: '4px',
        }}
    >
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder="Enter annotation text..."
            style={{ border: '1px solid gray', padding: '2px' }}
            autoFocus
        />
        <button
            onClick={onSubmit}
            style={{ backgroundColor: 'blue', color: 'white', marginLeft: '4px' }}
        >
            Add
        </button>
    </div>
);

export default TextInput;
