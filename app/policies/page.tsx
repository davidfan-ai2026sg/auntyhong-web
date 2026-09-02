export const metadata = { title: "Policies" };

export default function PoliciesPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">House rules</p>
      <h1 className="display mt-2 text-6xl">Policies</h1>
      <div className="mt-8 space-y-4 text-cocoa/80 leading-relaxed">
        <p>Currency SGD. Minimum online order S$50.</p>
        <p>Delivery under S$120 is S$15. Free from S$120. Optional 3-hour slot +S$40.</p>
        <p>Sentosa and Changi Airport are excluded. All sales are final.</p>
        <p>This website is a design demo for Uncle Lan Kitchen. It does not take live payment and is not a production shop.</p>
      </div>
    </div>
  );
}
