import { NavLink } from "react-router-dom";

type WorkspacePlaceholderCard = {
  title: string;
  description: string;
  actionLabel?: string;
  to?: string;
};

type WorkspacePlaceholderPageProps = {
  kicker: string;
  title: string;
  description: string;
  cards?: WorkspacePlaceholderCard[];
  noteTitle?: string;
  noteDescription?: string;
  notePoints?: string[];
};

export function WorkspacePlaceholderPage({
  kicker,
  title,
  description,
  cards = [],
  noteTitle = "功能占位已就绪",
  noteDescription = "当前页面先完成导航骨架与占位布局，后续可以直接在这里接入真实功能。",
  notePoints = []
}: WorkspacePlaceholderPageProps) {
  return (
    <main className="workspace-grid placeholder-grid">
      <section className="panel workspace-card page-panel workspace-placeholder-panel">
        <div className="workspace-placeholder-copy">
          <p className="panel-kicker">{kicker}</p>
          <h2>{title}</h2>
          <p className="section-copy">{description}</p>
        </div>

        {cards.length > 0 ? (
          <div className="workspace-placeholder-card-grid">
            {cards.map((card) => (
              <article className="workspace-placeholder-card" key={card.title}>
                <strong>{card.title}</strong>
                <p>{card.description}</p>
                {card.to && card.actionLabel ? (
                  <NavLink className="workspace-placeholder-link" to={card.to}>
                    {card.actionLabel}
                  </NavLink>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel workspace-card page-panel workspace-placeholder-note">
        <p className="panel-kicker">后续规划</p>
        <h2>{noteTitle}</h2>
        <p className="section-copy">{noteDescription}</p>
        {notePoints.length > 0 ? (
          <ul className="workspace-placeholder-points">
            {notePoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
