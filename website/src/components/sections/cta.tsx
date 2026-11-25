import Marquee from "@/components/ui/marquee";
import { Icons } from "@/components/icons";
import { DownloadBadge, TryIt } from "@/components/download";
import { cn } from "@/lib/utils";

/** Sample entries, as Peppercorn shows them. */
const entries = [
  { emoji: "🍔", name: "Lunch with Maya", when: "Today, 1:10 PM", amount: "-₹180.00" },
  { emoji: "💼", name: "Salary", when: "1 Nov, 9:00 AM", amount: "+₹68,000.00" },
  { emoji: "🚌", name: "Metro card", when: "20 Nov, 9:00 AM", amount: "-₹1,200.00" },
  { emoji: "🥇", name: "Gold, 2 g", when: "15 Nov, 11:30 AM", amount: "-₹22,840.00" },
  { emoji: "🎬", name: "Movie night", when: "23 Nov, 7:30 PM", amount: "-₹850.00" },
  { emoji: "🧾", name: "Rent", when: "4 Nov, 10:00 AM", amount: "-₹9,500.00" },
];

const firstRow = entries.slice(0, entries.length / 2);
const secondRow = entries.slice(entries.length / 2);

const EntryCard = ({ emoji, name, when, amount }: (typeof entries)[number]) => {
  return (
    <figure
      className={cn(
        "relative w-64 cursor-pointer overflow-hidden rounded-[2rem] border p-4",
        // light styles
        "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
        // dark styles
        "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]"
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10">
          {emoji}
        </span>
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium dark:text-white">
            {name}
          </figcaption>
          <p className="text-xs font-medium dark:text-white/40">{when}</p>
        </div>
      </div>
      <p className={cn("mt-2 text-sm font-medium", amount.startsWith("+") && "text-green-700 dark:text-green-400")}>
        {amount}
      </p>
    </figure>
  );
};

export function CTA() {
  return (
    <section id="cta">
      <div className="py-14">
        <div className="container flex w-full flex-col items-center justify-center p-4 mx-auto max-w-[var(--max-container-width)]">
          <div className="relative flex w-full max-w-[1000px] flex-col items-center justify-center overflow-hidden rounded-[2rem] border p-10 py-14">
            <div aria-hidden className="absolute rotate-[35deg]">
              <Marquee pauseOnHover className="[--duration:20s]" repeat={3}>
                {firstRow.map((entry) => (
                  <EntryCard key={entry.name} {...entry} />
                ))}
              </Marquee>
              <Marquee
                reverse
                pauseOnHover
                className="[--duration:20s]"
                repeat={3}
              >
                {secondRow.map((entry) => (
                  <EntryCard key={entry.name} {...entry} />
                ))}
              </Marquee>
              <Marquee pauseOnHover className="[--duration:20s]" repeat={3}>
                {firstRow.map((entry) => (
                  <EntryCard key={entry.name} {...entry} />
                ))}
              </Marquee>
              <Marquee
                reverse
                pauseOnHover
                className="[--duration:20s]"
                repeat={3}
              >
                {secondRow.map((entry) => (
                  <EntryCard key={entry.name} {...entry} />
                ))}
              </Marquee>
              <Marquee pauseOnHover className="[--duration:20s]" repeat={3}>
                {firstRow.map((entry) => (
                  <EntryCard key={entry.name} {...entry} />
                ))}
              </Marquee>
              <Marquee
                reverse
                pauseOnHover
                className="[--duration:20s]"
                repeat={3}
              >
                {secondRow.map((entry) => (
                  <EntryCard key={entry.name} {...entry} />
                ))}
              </Marquee>
            </div>
            <div className="z-10 mx-auto size-24 rounded-[2rem] border bg-white/10 p-3 shadow-2xl backdrop-blur-md dark:bg-black/10 lg:size-32">
              <Icons.logo className="mx-auto size-full text-primary dark:text-white" />
            </div>
            <div className="z-10 mt-4 flex flex-col items-center text-center text-black dark:text-white">
              <h2 className="text-3xl font-bold lg:text-4xl">
                Know where your money goes.
              </h2>
              <p className="mt-2">Free. No account, no ads.</p>
              <DownloadBadge className="mt-4" />
              <TryIt className="mt-4" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-b from-transparent to-white to-70% dark:to-black" />
          </div>
        </div>
      </div>
    </section>
  );
}
