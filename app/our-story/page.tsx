export const metadata = { title: "Our story" };

export default function StoryPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">The house</p>
      <h1 className="display mt-2 text-6xl">Our story</h1>
      <div className="mt-8 space-y-5 leading-relaxed text-cocoa/80">
        <p>
          Uncle Lan fries belinjau keropok and packs CNY boxes from a demo kitchen — not from a
          warehouse floor. The shop you are looking at is a design demo for friends and tasting
          the flow of an online gift house.
        </p>
        <p>
          Orders are packed to go. There is no walk-in counter. Collection is arranged; delivery skips
          Sentosa and Changi Airport.
        </p>
      </div>
    </div>
  );
}
