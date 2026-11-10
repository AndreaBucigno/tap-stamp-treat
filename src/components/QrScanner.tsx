import { Scanner } from "@yudiel/react-qr-scanner";

export default function QrScanner({ onScan, paused }: { onScan: (text: string) => void; paused: boolean }) {
  return (
    <Scanner
      paused={paused}
      onScan={(codes) => codes[0]?.rawValue && onScan(codes[0].rawValue)}
      constraints={{ facingMode: "environment" }}
      styles={{ container: { borderRadius: "1.5rem", overflow: "hidden" } }}
    />
  );
}
