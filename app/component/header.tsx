import { useState } from "react";

export function Header() {
    const [taskNum, setTaskNum] = useState('');


    const today = new Date()
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    return(
        <div className="flex-1 flex flex-col items-left gap-2 min-h-0">
            <span>{date}</span>
            <h1>Tareas</h1>
            <h6>{taskNum} tareas pendientes</h6>
        </div>
    );
}