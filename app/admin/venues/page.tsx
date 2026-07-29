import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { EntityManager, type CrudColumn, type CrudField } from "@/components/crud/entity-manager";
import { saveVenue, deleteVenue } from "./actions";
import { VENUE_TYPES } from "@/lib/constants";

const TYPE_LABEL: Record<string, string> = {
  lecture_hall: "Lecture hall",
  lab: "Lab",
  studio: "Studio",
};

export default async function VenuesPage() {
  await requireRole("admin");
  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" } });

  const rows = venues.map((v) => ({
    id: v.id,
    name: v.name,
    building: v.building,
    capacity: v.capacity,
    type: v.type,
    typeLabel: TYPE_LABEL[v.type] ?? v.type,
  }));

  const columns: CrudColumn[] = [
    { key: "name", label: "Name" },
    { key: "building", label: "Building" },
    { key: "capacity", label: "Capacity" },
    { key: "typeLabel", label: "Type" },
  ];

  const fields: CrudField[] = [
    { name: "name", label: "Venue name", type: "text", required: true, placeholder: "LT1" },
    { name: "building", label: "Building", type: "text", required: true, placeholder: "Main Block" },
    { name: "capacity", label: "Capacity", type: "number", required: true, placeholder: "200" },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: VENUE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
    },
  ];

  return (
    <EntityManager
      title="Venues"
      subtitle="Lecture halls, labs and studios available for allocation."
      resource="Venue"
      columns={columns}
      fields={fields}
      rows={rows}
      saveAction={saveVenue}
      deleteAction={deleteVenue}
    />
  );
}
