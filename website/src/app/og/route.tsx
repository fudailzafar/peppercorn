import { Icons } from "@/components/icons";
import { siteConfig } from "@/lib/config";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const postTitle = searchParams.get("title") || siteConfig.description;
  const font = fetch(
    new URL("../../assets/fonts/Inter-SemiBold.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());
  const fontData = await font;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "48px",
          backgroundColor: "#fff",
          // set background image if needed
          backgroundImage: `url(${siteConfig.url}/og.png)`,
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Icons.logo
            style={{
              width: "45px",
              height: "64px",
              color: "#0b57d0",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "64px",
              fontWeight: "600",
              marginTop: "24px",
              textAlign: "center",
              width: "80%",
              letterSpacing: "-0.05em", // Added tighter tracking
            }}
          >
            {postTitle}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              fontWeight: "500",
              marginTop: "16px",
              color: "#808080",
            }}
          >
            {siteConfig.name}
          </div>
        </div>

        <img
          src={`${siteConfig.url}/Device-3.png`}
          width={420}
          height={850}
          alt=""
          style={{ marginTop: "36px", flexShrink: 0 }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          style: "normal",
        },
      ],
    }
  );
}
