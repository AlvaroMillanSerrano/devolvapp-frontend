import { useState } from "react";
import type { ITask } from "~/type/header.interface";

export function TaskCreator() {
    let nameTask = "";
    const createTask = () => {
        const newTask: ITask = {
            id: Math.floor(Math.random() * 100),
            name: nameTask,
            completed: false
        }
    }

    const [newTask, createTaskNum] = useState('');
    return (
        <div>
            <input placeholder="Añadir nueva tarea..."/>
            <button>Añadir</button>
        </div>
    );
}