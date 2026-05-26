import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gym",
    short_name: "Gym",
    description: "Personal workout tracker",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f1e8",
    theme_color: "#d08c00",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
