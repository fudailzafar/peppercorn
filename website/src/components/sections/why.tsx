import { Section } from "@/components/section";
import { siteConfig } from "@/lib/config";

export function Why() {
  return (
    <Section
      title="Why Peppercorn"
      subtitle="Made to stay simple"
      className="container px-10 mx-auto"
    >
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 py-10">
        {siteConfig.reasons.map((reason) => (
          <div
            key={reason.title}
            className="bg-muted/60 overflow-hidden rounded-3xl flex flex-col h-fit break-inside-avoid"
          >
            <div className="px-4 py-5 sm:p-6 flex-grow">
              <div className="flex items-center mb-4">
                <span
                  aria-hidden
                  className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-lg"
                >
                  {reason.emoji}
                </span>
                <h3 className="ml-3 text-lg font-medium text-foreground">
                  {reason.title}
                </h3>
              </div>
              <p className="text-foreground">{reason.text}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
