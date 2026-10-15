export interface User {
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