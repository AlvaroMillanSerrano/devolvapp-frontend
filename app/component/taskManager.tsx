import { Header } from "./header";
import { TaskCreator } from "~/component/taskCreator";
import { TaskContainer } from "./taskContainer";

export function TaskManager() {

    return(
        <main className="flex-1 flex flex-col items-left justify-center gap-5 pd-5">
            <Header />
            <TaskCreator />
            <TaskContainer />
        </main>
    );
}