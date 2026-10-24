import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgroSentinel Nexus",
    short_name: "AgroSentinel",
    description: "Grounded agronomy in the field and the cooperative office",
    start_url: "/field",
    display: "standalone",
    background_color: "#F4F3EE",
    theme_color: "#1E4D3A",
  };
}
