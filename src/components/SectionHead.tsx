interface Props {
  eyebrow?: string
  title: string
  marginalia?: React.ReactNode
}

export function SectionHead({ eyebrow, title, marginalia }: Props) {
  return (
    <section className="pt-12 pb-6 rule-double">
      <div className="grid grid-cols-12 gap-6 items-end">
        <div className="col-span-12 md:col-span-9">
          {eyebrow && (
            <p className="font-meta text-[10px] tracking-[0.25em] text-gold mb-3">
              {eyebrow}
            </p>
          )}
          <h1
            className="font-display text-ink leading-[0.92] tracking-tight"
            style={{ fontSize: 'clamp(54px, 12vw, 168px)' }}
          >
            {title}
          </h1>
        </div>
        {marginalia && (
          <div className="col-span-12 md:col-span-3 md:text-right pb-2">
            {marginalia}
          </div>
        )}
      </div>
    </section>
  )
}
