import { useState } from "react";

export function Task() {
    const [isCompleted, setCompleted] = useState(true);
    return(
        <div>
            <input type="radio" />
            <label>Task en template</label>
            <button> x</button>
        </div>
    );
}