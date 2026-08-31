export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">Reach us</p>
      <h1 className="display mt-2 text-6xl">Contact</h1>
      <div className="mt-8 space-y-3 text-cocoa/80">
        <p>
          <a href="https://wa.me/6596381788" className="border-b border-gold hover:text-cinnabar">
            WhatsApp +65 9638 1788
          </a>
        </p>
        <p>1005 Aljunied Ave 5 #01-42, Singapore 389886</p>
        <p>No walk-in. Please write or WhatsApp first.</p>
      </div>
    </div>
  );
}
