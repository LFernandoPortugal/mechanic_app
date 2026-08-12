import type { Job, WorkshopSettings } from "@/types";

export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-fixture-00000001",
    workshopId: "fixture-workshop",
    vehicleId: "QA-VEHICLE-01",
    make: "Toyota",
    model: "Yaris",
    clientId: "Cliente Fixture",
    advisorId: "advisor-fixture",
    technicianId: "technician-fixture",
    status: "Diagnosis",
    symptoms: "Ruido al frenar",
    vehicleType: "auto",
    fluidAudit: {
      oilLevel: "OK",
      coolantLevel: "OK",
      brakeFluid: "OK",
    },
    valuables: {
      lockNutKey: false,
      sunglasses: false,
      documents: false,
    },
    startingFuel: 50,
    odometer: 45000,
    inspectionItems: [],
    declinedItems: [],
    totalEstimate: 0,
    approvedAmount: 0,
    createdAt: new Date("2026-08-11T12:00:00.000Z"),
    auditLog: [],
    ...overrides,
  };
}

export const workshopFixture: WorkshopSettings = {
  workshopName: "Taller Fixture",
  logoUrl: "",
  address: "Dirección local",
  phone: "",
  taxId: "",
  termsAndConditions: "",
  demoMode: false,
  currencySymbol: "S/.",
  taxRate: 18,
  taxName: "IGV",
};
