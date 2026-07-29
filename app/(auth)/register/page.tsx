import { prisma } from "@/lib/prisma";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

// Server component: load departments for the form's dropdown, then render the client form.
export default async function RegisterPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return <RegisterForm departments={departments} />;
}
