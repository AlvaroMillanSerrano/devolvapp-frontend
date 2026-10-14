import { UserList } from "./userList"

export const AdminHome = () => {
    return (
        <div className="flex flex-col justify-center items-center h-screen">
            <h1>ADMIN HOME</h1>
            <div className="flex flex-row gap-1">
                <UserList />
            </div>
        </div>
    )
}