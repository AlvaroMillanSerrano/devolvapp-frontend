import { useState } from "react"
import DataTable, { type TableColumn } from "react-data-table-component";

interface User {
    id: number;
    u_name: string;
    surname: string;
    dni: string;
    number: string;
    email: string;
    u_role: "admin" | "cliente" | "recogedor";
    wallet_quantity: number;
    city: string;
    street: string;
    building: string;
    floor: string;
    letter: string;
    zip_code: string;
    creation_date: string;
    isActive: boolean;
}
export const UserList = () => {
    const [usuarios, setUsuarios] = useState([]);

    const data: User[] = [
        {
            id: 1,
            u_name: "Jorge",
            surname: "Munoz",
            dni: "40328493J",
            number: "666483920",
            email: "jorge@gmail.com",
            u_role: "cliente",
            wallet_quantity: 9.3,
            city: "Malaga",
            street: "Palma",
            building: "3",
            floor: "1",
            letter: "A",
            zip_code: "29010",
            creation_date: "10/12/2025",
            isActive: true
        },
        {
            id: 1,
            u_name: "Alvaro",
            surname: "Millan",
            dni: "12345678A",
            number: "661432123",
            email: "alvaro@gmail.com",
            u_role: "cliente",
            wallet_quantity: 2.3,
            city: "Malaga",
            street: "Carranque",
            building: "2",
            floor: "3",
            letter: "D",
            zip_code: "29005",
            creation_date: "10/12/2025",
            isActive: true
        }
    ];
    const columns: TableColumn<User>[] = [
        {name: "id", selector: (row) => row.id}, 
        {name: "name", selector: (row) => row.u_name},
        {name: "surname", selector: (row) => row.surname}, 
        {name: "dni", selector: (row) => row.dni},
        {name: "number", selector: (row) => row.number},
        {name: "email", selector: (row) => row.email},
        {name: "role", selector: (row) => row.u_role},
        {name: "wallet_quantity", selector: (row) => row.wallet_quantity},
        {name: "address", selector: (row) => `
            ${row.city} ${row.street} ${row.building} ${row.floor} ${row.letter}
        `},
        {name: "zip_code", selector: (row) => row.zip_code},
        {name: "creation_date", selector: (row) => row.creation_date},
        {name: "isActive", selector: (row) => row.isActive ? "true" : "false"}
    ];
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2>Listado de Usuarios</h2>
            <div>
                <DataTable columns={columns} data={data} pagination />
            </div>
        </div>
    );
}