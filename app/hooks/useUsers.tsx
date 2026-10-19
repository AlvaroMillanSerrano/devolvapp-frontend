import { useState, useEffect } from "react";
import axios from "axios";
import type { User } from "../data/user";

export const useUsers = () => {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        axios.get<User[]>("http://localhost:8080/api/v1/usuarios")
            .then(res => setUsers(res.data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, []);
    
    return {users, loading, error};
}

