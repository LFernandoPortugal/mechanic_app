"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { VehicleIcon } from "./vehicle-icons";
import { VehicleType } from "@/types";

interface VehicleTypeSelectorProps {
  value: VehicleType;
  onChange: (type: VehicleType) => void;
  disabled?: boolean;
}

export default function VehicleTypeSelector({ 
  value, 
  onChange, 
  disabled = false 
}: VehicleTypeSelectorProps) {
  const { t } = useLanguage();

  const types: { key: VehicleType; labelKey: string; descKey: string }[] = [
    { key: "auto", labelKey: "vehicleAuto", descKey: "vehicleAutoDesc" },
    { key: "suv", labelKey: "vehicleSUV", descKey: "vehicleSUVDesc" },
    { key: "pickup", labelKey: "vehiclePickup", descKey: "vehiclePickupDesc" },
    { key: "minivan", labelKey: "vehicleMinivan", descKey: "vehicleMinivanDesc" },
    { key: "truck", labelKey: "vehicleTruck", descKey: "vehicleTruckDesc" },
    { key: "moto", labelKey: "vehicleMoto", descKey: "vehicleMotoDesc" },
    { key: "ebike", labelKey: "vehicleEBike", descKey: "vehicleEBikeDesc" },
    { key: "parts", labelKey: "vehicleParts", descKey: "vehiclePartsDesc" },
    { key: "other", labelKey: "vehicleOther", descKey: "vehicleOtherDesc" },
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        {t("vehicleType")} *
      </label>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {types.map((type) => {
          const isSelected = value === type.key;
          return (
            <button
              key={type.key}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onChange(type.key)}
              className={`group relative flex min-h-32 flex-col items-center justify-between overflow-hidden rounded-xl border p-4 text-center transition-[background-color,border-color,box-shadow,color,transform] duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } ${
                isSelected
                  ? "border-primary bg-primary/15 text-primary shadow-[inset_0_3px_0_var(--primary),0_8px_22px_rgb(185_71_14_/_0.12)]"
                  : "border-border bg-card hover:border-primary/55 hover:bg-primary/8 hover:text-primary hover:-translate-y-0.5"
              }`}
            >
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg border transition-[background-color,border-color,color,transform] group-hover:scale-105 ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-secondary/55 text-muted-foreground group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary"
              }`}>
                <VehicleIcon 
                  type={type.key} 
                  className="h-6 w-6"
                />
              </div>
              
              <div className="space-y-1 w-full">
                <div className="text-xs font-bold truncate">
                  {t(type.labelKey)}
                </div>
                <div className="text-[10px] text-muted-foreground/80 font-light leading-tight line-clamp-2 min-h-[28px] max-w-full">
                  {t(type.descKey)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
