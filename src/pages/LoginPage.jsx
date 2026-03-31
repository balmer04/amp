import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const quickAccessUsers = {
  client: {
    email: 'cliente@amprev.com',
    password: 'cliente123',
  },
  admin: {
    email: 'admin@amprev.com',
    password: 'admin123',
  },
}

export function LoginPage() {
  const { session, login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to={session.role === 'admin' ? '/admin' : '/cliente'} replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const submitLogin = (credentials = formData) => {
    const result = login(credentials)

    if (!result.ok) {
      setError(result.message)
      return
    }

    const redirectPath =
      location.state?.from && location.state.from !== '/'
        ? location.state.from
        : result.role === 'admin'
          ? '/admin'
          : '/cliente'

    navigate(redirectPath, { replace: true })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    submitLogin()
  }

  const handleQuickAccess = (role) => {
    const credentials = quickAccessUsers[role]
    setFormData(credentials)
    setError('')
    submitLogin(credentials)
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand-lockup">
          <div className="brand-badge" aria-label="Logo Andrés Merino">
            <img
              src="/branding/logo-cadena-pinturerias.png"
              alt="Cadena de Pinturerias"
              className="brand-logo-image"
            />
          </div>
          <h1>Ingresá a tu espacio de trabajo</h1>
          <p className="brand-copy">
            Una entrada clara para clientes y administradores, lista para seguir
            construyendo los paneles que vienen después.
          </p>
        </div>

        <div className="login-card">
          <div className="card-glow" aria-hidden="true"></div>
          <h2>Iniciá sesión</h2>
          <p className="card-copy">
            Usá una cuenta de prueba para entrar al panel correspondiente.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Usuario / Email</span>
              <input
                type="email"
                name="email"
                placeholder="tucuenta@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field">
              <span>Contraseña</span>
              <input
                type="password"
                name="password"
                placeholder="********"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="primary-button">
              Ingresar
            </button>
          </form>

          <div className="login-footer">
            <p>Probá las vistas del mockup</p>
            <div className="quick-actions">
              <button
                type="button"
                className="pill-button"
                onClick={() => handleQuickAccess('client')}
              >
                Ver como cliente
              </button>
              <button
                type="button"
                className="pill-button"
                onClick={() => handleQuickAccess('admin')}
              >
                Ver como admin
              </button>
            </div>
          </div>

          <div className="login-request-card">
            <p className="login-request-eyebrow">Acceso mayorista</p>
            <h3>Solicitá tu cuenta profesional</h3>
            <p>
              Si tenés una pinturería, empresa o perfil profesional, pedí acceso al
              canal mayorista de Andrés Merino.
            </p>
            <a
              className="login-request-button"
              href="mailto:admin@amprev.com?subject=Solicitud%20de%20cuenta%20profesional"
            >
              Solicitar cuenta profesional
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
