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
              disabled={disabled}
              onClick={() => onChange(type.key)}
              className={`flex flex-col items-center justify-between text-center p-4 rounded-xl border transition-all duration-300 select-none group text-left ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } ${
                isSelected
                  ? "border-violet-500/80 bg-violet-950/20 text-violet-400 dark:bg-violet-950/30 shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/50"
                  : "border-border/60 bg-card/45 hover:border-violet-500/40 hover:bg-violet-950/5 hover:text-violet-400/90 hover:-translate-y-0.5"
              }`}
            >
              <div className="w-12 h-12 rounded-lg bg-secondary/40 group-hover:bg-secondary/60 flex items-center justify-center mb-3 transition-colors border border-border/30">
                <VehicleIcon 
                  type={type.key} 
                  className={`w-6 h-6 transition-transform group-hover:scale-110 ${
                    isSelected ? "text-violet-400" : "text-muted-foreground group-hover:text-violet-400"
                  }`} 
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
