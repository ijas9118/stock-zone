import { getLocations } from "@/actions/admin/locations";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "@/components/admin/locations/columns";
import { LocationHeader } from "@/components/admin/locations/location-header";

export default async function LocationsPage() {
  const { locations } = await getLocations({
    pageSize: 100,
    includeInactive: true,
  });

  return (
    <div className="space-y-6">
      <LocationHeader />
      <DataTable
        columns={columns}
        data={locations}
        totalCount={locations.length}
        pageCount={1}
      />
    </div>
  );
}
