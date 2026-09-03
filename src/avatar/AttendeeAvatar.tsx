import { initialsFromName, colorFromName } from "./avatar";

export function AutoAvatar({ fullName, size = 64 }: { fullName: string; size?: number }) {
  const color = colorFromName(fullName);
  return (
    <div
      className="flex items-center justify-center rounded-full font-display font-bold text-base-950"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.36 }}
      aria-label={`Avatar de ${fullName}`}
    >
      {initialsFromName(fullName)}
    </div>
  );
}

export function AttendeeAvatar({
  fullName,
  avatarUrl,
  size = 64,
}: {
  fullName: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <AutoAvatar fullName={fullName} size={size} />;
}
