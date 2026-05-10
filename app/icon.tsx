import { ImageResponse } from "next/og";

// Tells Next this is a route segment, not a page.
export const runtime = "edge";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "white",
          fontSize: 110,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: "-0.05em",
          borderRadius: 32,
        }}
      >
        G
      </div>
    ),
    { ...size },
  );
}
