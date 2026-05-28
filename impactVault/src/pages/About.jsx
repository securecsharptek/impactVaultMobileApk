export default function About() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-stone-900 mb-6 tracking-tight">About Impact Vault</h1>

        <p className="text-lg text-stone-600 leading-relaxed mb-6">
          Impact Vault is a purpose-built app designed to help families and carers of people with disability
          capture, organise, and communicate the real-life impact of disability on daily functioning. Whether
          you're preparing for an NDIS plan review, working with allied health professionals, or simply trying
          to keep a meaningful record of your loved one's journey, Impact Vault gives you the tools to do it
          clearly and confidently.
        </p>

        <p className="text-lg text-stone-600 leading-relaxed mb-6">
          The app is designed for parents, carers, and support coordinators who spend countless hours trying
          to translate lived experience into documentation that decision-makers can understand. Impact Vault
          bridges that gap — turning everyday observations into structured, evidence-backed reports that
          speak the language of NDIS planning and therapeutic review.
        </p>

        <p className="text-lg text-stone-600 leading-relaxed mb-6">
          Features include daily functional impact logging, goal tracking aligned to NDIS support categories,
          caregiver capacity monitoring, an evidence library for storing relevant documents and reports, and
          automated professional-quality reports you can share with planners, therapists, and review bodies.
          The Insights add-on unlocks pattern analysis to help identify trends across time, triggers, and
          support needs.
        </p>

        <p className="text-lg text-stone-600 leading-relaxed">
          Impact Vault is built and maintained by a small Australian team who understand firsthand the
          challenges that come with navigating disability support systems. Our mission is simple: to make
          sure every family has the evidence they need to advocate effectively — without the overwhelm.
        </p>

        <div className="mt-12 pt-8 border-t border-stone-200">
          <p className="text-sm text-stone-400">
            Have questions?{' '}
            <a href="/Contact" className="text-stone-600 underline hover:text-stone-900">
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}