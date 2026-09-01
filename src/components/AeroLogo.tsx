import Image from "next/image";

const LOGO_SRC = "/GB logo.jpg";

export function AeroLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Greenback — Cash Back on Cannabis"
      width={Math.round(size * 2.75)}
      height={size}
      className="object-contain object-center"
      style={{ height: size, width: "auto" }}
      priority
    />
  );
}

export function AeroWordmark({ size = 36 }: { size?: number }) {
  return (
    <span className="flex w-full items-center justify-center">
      <AeroLogo size={size} />
    </span>
  );
}
