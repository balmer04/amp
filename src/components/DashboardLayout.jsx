import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function DashboardLayout({ eyebrow, title, description, sections }) {
  const { logout, session } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="dashboard-user-card">
            <span className="dashboard-user-label">Sesión activa</span>
            <strong>{session.name}</strong>
            <span>{session.email}</span>
            <button type="button" className="ghost-button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="dashboard-grid">
          {sections.map((section) => (
            <article key={section.title} className="dashboard-card">
              <span className="dashboard-card-tag">{section.tag}</span>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}
