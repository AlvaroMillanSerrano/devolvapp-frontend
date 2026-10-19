import { AdminHome } from "../../components/home/admin/adminHome";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  // if(user.role === 'admin') return <AdminHome />;
  // if(user.role === 'collector') return <CollectorHome />;
  // if(user.role === 'customer') return <CustomerHome />;
  return <AdminHome />
}
