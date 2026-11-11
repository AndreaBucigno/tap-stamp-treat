import { Scanner } from "@yudiel/react-qr-scanner";

export default function QrScanner({ onScan, paused, onError }: { onScan: (text: string) => void; paused: boolean; onError: () => void }) {
  return (
    <Scanner
      paused={paused}
      onError={onError}
      onScan={(codes) => codes[0]?.rawValue && onScan(codes[0].rawValue)}
      constraints={{ facingMode: "environment" }}
      styles={{ container: { borderRadius: "1.5rem", overflow: "hidden" } }}
    />
  );
}
