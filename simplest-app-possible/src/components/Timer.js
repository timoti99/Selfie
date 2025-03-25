import React, { useState, useEffect } from 'react';

function Timer() {
    const [time, setTime] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setTime(prevTime => prevTime + 1);
        }, 1000);

        return () => clearInterval(intervalId); // Cleanup on component unmount
    }, []); // Empty dependency array means this effect runs only once on mount

    return <h1>Timer: {time} seconds</h1>;
}

export default Timer;
