import DataTable, { type TableColumn } from "react-data-table-component";
import type { User } from "~/data/user";
import { useUsers } from "~/hooks/useUsers";

export const UserList = () => {
    const { users, loading, error } = useUsers();

    const columns: TableColumn<User>[] = [
        {name: "id", selector: (row) => row.id}, 
        {name: "name", selector: (row) => row.u_name},
        {name: "surname", selector: (row) => row.surname}, 
        {name: "dni", selector: (row) => row.id_card},
        {name: "number", selector: (row) => row.phone_number},
        {name: "email", selector: (row) => row.email},
        {name: "role", selector: (row) => row.u_role},
        {name: "wallet_quantity", selector: (row) => row.wallet},
        {name: "address", selector: (row) => `
            ${row.city} ${row.street} ${row.building} ${row.floor} ${row.letter}
        `},
        {name: "zip_code", selector: (row) => row.zip_code},
        {name: "creation_date", selector: (row) => row.created_at},
        {name: "isActive", selector: (row) => row.isActive ? "true" : "false"}
    ];
    if (loading) return <p>Cargando...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2>Listado de Usuarios</h2>
            <div>
                <DataTable columns={columns} data={users} pagination />
            </div>
        </div>
    );
}