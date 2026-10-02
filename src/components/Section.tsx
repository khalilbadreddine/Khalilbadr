import type { SectionContent } from '../content'
import { ICONS } from './Icons'

interface Props extends SectionContent {
  index: number
  total: number
}

/** "Name — details" points get the name in bold. */
function Point({ text }: { text: string }) {
  const at = text.indexOf(' — ')
  if (at < 0) return <li>{text}</li>
  return (
    <li>
      <strong>{text.slice(0, at)}</strong>
      {text.slice(at)}
    </li>
  )
}

export function Section({ id, index, total, kicker, title, accent, body, tagline, points, chips, links }: Props) {
  const Heading = id === 'hero' ? 'h1' : 'h2'
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <section className={`panel panel-${id}`} data-section id={id}>
      <p className="counter" aria-hidden="true">
        {pad(index + 1)} <span>/ {pad(total)}</span>
      </p>
      {id === 'hero' && (
        <p className="motto" aria-hidden="true">
          Build
          <br />
          Learn
          <br />
          Ship
        </p>
      )}
      <div className="copy">
        <p className="kicker">{kicker}</p>
        <Heading>
          {title}
          <br />
          <span className="accent">{accent}</span>
        </Heading>
        {body && <p className="lead">{body}</p>}
        {tagline && <p className="tagline">{tagline}</p>}
        {points && (
          <ul className="points">
            {points.map((p) => (
              <Point key={p} text={p} />
            ))}
          </ul>
        )}
        {chips && (
          <ul className="chips">
            {chips.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
        {links && (
          <nav className="links">
            {links.map((l) => {
              const Icon = ICONS[l.label]
              return (
                <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  {Icon && <Icon />}
                  {l.label}
                </a>
              )
            })}
          </nav>
        )}
      </div>
      {id === 'hero' && <p className="footnote">Scroll to explore</p>}
      {index === total - 1 && <p className="footnote">Thanks for stopping by</p>}
    </section>
  )
}
