import { EmailLink, XLink } from '@/components/ui/ContactLinks';

export default function Contacts() {
  return (
    <section className="shell py-16 md:py-24" aria-labelledby="contacts-heading">
      <p className="chapter-label">Get in touch</p>
      <h1 id="contacts-heading" className="t-display">Contacts</h1>
      <p className="mt-6 max-w-reading text-body text-ink-secondary">
        A question about Palissage, direct wine trade or the pilot? We’d love to hear from you.
      </p>
      <div className="mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card p-6 sm:p-8">
          <h2 className="t-h2">Email</h2>
          <p className="mt-3 text-body-sm text-ink-secondary">Write to the team.</p>
          <EmailLink className="mt-5 text-body-sm sm:text-body" />
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="t-h2">Find us on X</h2>
          <p className="mt-3 text-body-sm text-ink-secondary">Follow the project and join the conversation.</p>
          <XLink showHandle className="mt-5 text-body-sm" />
        </div>
      </div>
    </section>
  );
}
