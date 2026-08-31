import { CorporateForm } from "@/components/CorporateForm";

export const metadata = { title: "Corporate gifting" };

export default function CorporatePage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">For the office</p>
      <h1 className="display mt-2 text-6xl">Corporate gifting</h1>
      <p className="mt-5 text-cocoa/75 leading-relaxed">
        Tins, gift boxes, and tea for clients and teams. Tell the kitchen the headcount and date —
        this is a demo enquiry, not a live booking.
      </p>
      <CorporateForm />
    </div>
  );
}
