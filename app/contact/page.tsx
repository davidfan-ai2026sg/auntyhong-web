export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">Reach us</p>
      <h1 className="display mt-2 text-6xl">Contact</h1>
      <div className="mt-8 space-y-3 text-cocoa/80">
        <p>Uncle Lan Kitchen (demo)</p>
        <p>
          <a href="https://wa.me/6580000000" className="border-b border-gold hover:text-cinnabar">
            WhatsApp +65 8000 0000 (demo)
          </a>
        </p>
        <p>88 Demo Lane #01-01, Singapore 123456</p>
        <p>
          <a href="mailto:hello@unclelan.demo" className="border-b border-gold hover:text-cinnabar">
            hello@unclelan.demo
          </a>
        </p>
        <p>No walk-in. Please write or WhatsApp first.</p>
      </div>
    </div>
  );
}
