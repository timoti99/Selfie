import React from "react";
import watermelon from '../watermelon.png';

export default function TimeTell(props) {
    return (
        <nav className="navbar bg-body-tertiary">
            <div className="container-fluid">
                <a className="navbar-brand" href="/">
                    <img src={watermelon} style={{ width: '50px' }} alt="Watermelon Icon"/>
                </a>
                <h3 style={{ color: props.color }}>This is a Simple Event Handler</h3>
            </div>
        </nav>
    )
}
