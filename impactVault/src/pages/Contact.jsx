export default function Contact() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-stone-900 mb-4 tracking-tight">Contact Us</h1>
        <p className="text-lg text-stone-500 mb-10">
          We'd love to hear from you. Reach out with questions, feedback, or support requests.
        </p>

        <div className="bg-white border border-stone-200 rounded-2xl p-8 space-y-6">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Email</p>
            <a
              href="mailto:support@impactvault.com.au"
              className="text-lg font-medium text-stone-800 hover:text-[#C4975A] transition-colors"
            >
              support@impactvault.com.au
            </a>
          </div>

          <div className="border-t border-stone-100 pt-6">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">General Enquiries</p>
            <a
              href="mailto:hello@impactvault.com.au"
              className="text-lg font-medium text-stone-800 hover:text-[#C4975A] transition-colors"
            >
              hello@impactvault.com.au
            </a>
          </div>

          <div className="border-t border-stone-100 pt-6">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Response Time</p>
            <p className="text-stone-500 text-sm leading-relaxed">
              We aim to respond to all enquiries within 1–2 business days (AEST). For urgent support issues,
              please use the subject line <strong>"Urgent"</strong> in your email.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-stone-400">
            Based in Australia · Supporting NDIS families nationwide
          </p>
        </div>
      </div>
    </div>
  );
}