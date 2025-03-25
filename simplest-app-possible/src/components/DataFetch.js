import React, { useState, useEffect } from 'react';

function DataFetch() {
    const [data, setData] = useState(null);

    useEffect(() => {
        async function fetchData() {
            const response = await fetch('https://api.example.com/data');
            const jsonData = await response.json();
            setData(jsonData);
        }

        fetchData();
    }, []); // Runs only once after the component is mounted

    if (!data) return <div>Loading...</div>;

    return (
        <div>
            <h1>{data.title}</h1>
            <p>{data.description}</p>
        </div>
    );
}

export default DataFetch;
