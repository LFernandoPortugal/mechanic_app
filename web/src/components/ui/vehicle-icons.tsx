import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

// 🚗 Sedan / Car
export function AutoIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

// 🚙 SUV / Crossover / Todo Terreno
export function SUVIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-4c0-1.2-1-2.2-2.2-2.2h-2.3c-.6 0-1.2-.3-1.6-.8L12.5 6c-.5-.6-1.3-1-2.1-1H4c-.8 0-1.5.6-1.7 1.4L1 11.5c0 .3-.1.6-.1.9v3.6c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
      <path d="M14 9.5h4" />
    </svg>
  );
}

// 🛻 Pick-up / Camioneta de Platón
export function PickupIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2 13v3c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
      <path d="M19 17h2c.6 0 1-.4 1-1v-4.5h-5.5V10h-2.2L12 6.5C11.5 6 10.8 5.8 10 5.8H5c-.8 0-1.5.6-1.7 1.4L1.8 11" />
      <path d="M16.5 12.5v-3" />
    </svg>
  );
}

// 🚐 Minivan / Combi / Van
export function MinivanIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2 17h3" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
      <path d="M19 17h2c.6 0 1-.4 1-1V9c0-1.7-1.3-3-3-3H5C3.3 6 2 7.3 2 9v7c0 .6.4 1 1 1" />
      <path d="M6 10h4v3H6z" />
      <path d="M12 10h4v3H12z" />
      <path d="M18 10h3v3h-3z" />
    </svg>
  );
}

// 🚛 Camión / Vehículo de Carga
export function TruckIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14 18H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8v16z" />
      <path d="M14 8h6l3 3v5a2 2 0 0 1-2 2h-1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M9 18h6" />
    </svg>
  );
}

// 🏍️ Motocicleta / Scooter
export function MotoIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="5" cy="16" r="3" />
      <circle cx="19" cy="16" r="3" />
      <path d="M12 16h4M5 13l3-6h5l1.5 3.5H19" />
      <path d="M11 7l-2 5h7.5" />
      <path d="M13 5.5l1.5-2" />
    </svg>
  );
}

// 🚲 Bicimoto / Bicicleta Eléctrica
export function EBikeIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="5" cy="16" r="3" />
      <circle cx="19" cy="16" r="3" />
      <path d="M12 16h4" />
      <path d="M5 16l3.5-5.5h6L19 16" />
      <path d="M11.5 10.5v3h3" />
      <rect x="9.5" y="13.5" width="2" height="2" rx="0.5" />
      <path d="M14.5 5.5h-3" />
    </svg>
  );
}

// ⚙️ Partes / Piezas / Módulos
export function PartsIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ❓ Otros / Especiales
export function OtherIcon({ className = "", size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
}

// Global helper to render the correct icon by key
export function VehicleIcon({ 
  type, 
  className = "", 
  size = 24, 
  ...props 
}: IconProps & {
  type: string | undefined; 
}) {
  switch (type) {
    case "auto":
      return <AutoIcon className={className} size={size} {...props} />;
    case "suv":
      return <SUVIcon className={className} size={size} {...props} />;
    case "pickup":
      return <PickupIcon className={className} size={size} {...props} />;
    case "minivan":
      return <MinivanIcon className={className} size={size} {...props} />;
    case "truck":
      return <TruckIcon className={className} size={size} {...props} />;
    case "moto":
      return <MotoIcon className={className} size={size} {...props} />;
    case "ebike":
      return <EBikeIcon className={className} size={size} {...props} />;
    case "parts":
      return <PartsIcon className={className} size={size} {...props} />;
    default:
      return <OtherIcon className={className} size={size} {...props} />;
  }
}
