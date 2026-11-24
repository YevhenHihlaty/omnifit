type FaqItem = { q: string; a: string }

type PricingFaqProps = {
  title: string
  items: FaqItem[]
}

/** Design Web-Pricing: always-open Q&A stack (no accordion). */
export const PricingFaq = ({ title, items }: PricingFaqProps) => (
  <section className="mt-16" aria-labelledby="pricing-faq-heading">
    <h2
      id="pricing-faq-heading"
      className="text-center font-display text-2xl font-bold tracking-tight text-ink-900 md:text-[28px]"
    >
      {title}
    </h2>
    <ul className="mx-auto mt-8 flex max-w-[820px] flex-col gap-6">
      {items.map((item) => (
        <li
          key={item.q}
          className="border-b border-stone-300 pb-[18px] last:border-0"
        >
          <h3 className="font-display text-[15.5px] font-semibold text-ink-900">
            {item.q}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{item.a}</p>
        </li>
      ))}
    </ul>
  </section>
)
