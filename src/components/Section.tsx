interface Props {
  kicker: string
  title: string
  body: string
}

export function Section({ kicker, title, body }: Props) {
  return (
    <section className="panel" data-section>
      <div className="copy">
        <p className="kicker">{kicker}</p>
        <h2>{title}</h2>
        <p className="lead">{body}</p>
      </div>
    </section>
  )
}
