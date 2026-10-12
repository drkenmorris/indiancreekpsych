import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

export default function MakeAnAppointmentPage() {
  return (
    <div className="publicSite">
      <PublicHeader />
      <main>
        <section className="appointmentAccess">
          <div>
            <p className="eyebrow">Patient appointment access</p>
            <h2>Request and manage appointments through your secure patient account.</h2>
            <p>New patients can create a Patient account, verify their email, complete required security setup and intake, and then use the secure appointment calendar. Returning patients can sign in and go directly to Appointments.</p>
            <div className="heroActions">
              <Link className="primaryButton" href="/appointments">Open Appointments</Link>
              <Link className="secondaryButton" href="/register">Create Patient Account</Link>
              <Link className="secondaryButton" href="/login?next=/appointments">Patient Sign In</Link>
            </div>
          </div>
          <div className="appointmentSteps">
            <article><span>1</span><h3>Create or sign in</h3><p>Select Patient when registering, or sign in to your existing account.</p></article>
            <article><span>2</span><h3>Complete secure setup</h3><p>Verify your email and complete required security and intake steps.</p></article>
            <article><span>3</span><h3>Choose an appointment</h3><p>Use the secure appointment area to view available times and manage visits.</p></article>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
