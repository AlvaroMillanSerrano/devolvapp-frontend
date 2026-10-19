export interface User {
    id: number;
    name: string;
    surname: string;
    idCard: string;
    phoneNumber: string;
    email: string;
    rol: "admin" | "cliente" | "recogedor";
    wallet: number;
    city: string;
    street: string;
    building: string;
    floor: string;
    letter: string;
    zip_code: string;
    created_at: string;
    isActive: boolean;
}