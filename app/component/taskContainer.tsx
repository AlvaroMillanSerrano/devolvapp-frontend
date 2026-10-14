import { useState } from "react";
import { Task } from "./task";
import type { ITask } from "~/type/header.interface";

export function TaskContainer() {

    return(
        <div>
            <Task />
            <Task />
            <Task />

            <button>Borrar completados</button>
        </div>
    );
}