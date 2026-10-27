import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return process.env.DIVERSIBEBE_V2_PREVIEW === "1"
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/", disallow: ["/v2/", "/profil", "/dashboard", "/plan", "/jurnal", "/alergii", "/admin"] } };
}
