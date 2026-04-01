import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const quickAccessUsers = import.meta.env.DEV
  ? {
    client: { email: 'cliente@amprev.com', password: 'cliente123' },
    admin: { email: 'admin@amprev.com', password: 'admin123' },
  }
  : null

export function LoginPage() {
  const { session, login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showRequestForm, setShowRequestForm] = useState(false)
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [requestData, setRequestData] = useState({
    nombre: '',
    cuit: '',
    telefono: '',
    email: '',
  })

  if (isAuthenticated) {
    return <Navigate to={session.role === 'admin' ? '/admin' : '/cliente'} replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const submitLogin = async (credentials = formData) => {
    setIsSubmitting(true)
    try {
      const result = await login(credentials)

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
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    submitLogin()
  }

  const handleRequestChange = (event) => {
    const { name, value } = event.target
    setRequestData((current) => ({ ...current, [name]: value }))
  }

  const handleRequestSubmit = (event) => {
    event.preventDefault()
    setIsRequestSubmitting(true)
    setTimeout(() => {
      setIsRequestSubmitting(false)
      setRequestSent(true)
      setTimeout(() => {
        setShowRequestForm(false)
        setRequestSent(false)
        setRequestData({ nombre: '', cuit: '', telefono: '', email: '' })
      }, 3500)
    }, 1200)
  }

  const handleQuickAccess = async (role) => {
    if (!quickAccessUsers) return
    const credentials = quickAccessUsers[role]
    setFormData(credentials)
    setError('')
    await submitLogin(credentials)
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
        </div>

        <div className="login-card">
          <div className="card-glow" aria-hidden="true"></div>
          <h2>Iniciá sesión</h2>

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

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          {quickAccessUsers && (
            <div className="login-footer">
              <p>Probá las vistas del mockup</p>
              <div className="quick-actions">
                <button
                  type="button"
                  className="pill-button"
                  onClick={() => handleQuickAccess('client')}
                  disabled={isSubmitting}
                >
                  Ver como cliente
                </button>
                <button
                  type="button"
                  className="pill-button"
                  onClick={() => handleQuickAccess('admin')}
                  disabled={isSubmitting}
                >
                  Ver como admin
                </button>
              </div>
            </div>
          )}

          <div className="login-request-card">
            <p className="login-request-eyebrow">Acceso mayorista</p>
            <h3>Solicitá tu cuenta profesional</h3>

            {!showRequestForm ? (
              <>
                <p>
                  Si tenés una pinturería, empresa o perfil profesional, pedí acceso al
                  canal mayorista de Andrés Merino.
                </p>
                <button
                  type="button"
                  className="login-request-button"
                  onClick={() => setShowRequestForm(true)}
                >
                  Solicitar cuenta profesional
                </button>
              </>
            ) : requestSent ? (
              <p style={{ color: '#10b981', fontWeight: '600', marginTop: '1rem' }}>
                ¡Solicitud enviada! Nos pondremos en contacto pronto.
              </p>
            ) : (
              <form className="request-form" onSubmit={handleRequestSubmit}>
                <label className="field">
                  <span>Nombre o Razón Social</span>
                  <input type="text" name="nombre" placeholder="Pinturería Ej." value={requestData.nombre} onChange={handleRequestChange} required />
                </label>
                <label className="field">
                  <span>CUIT / RUT</span>
                  <input type="text" name="cuit" placeholder="XX-XXXXXXXX-X" value={requestData.cuit} onChange={handleRequestChange} required />
                </label>
                <label className="field">
                  <span>Teléfono</span>
                  <input type="tel" name="telefono" placeholder="11 1234 5678" value={requestData.telefono} onChange={handleRequestChange} required />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" name="email" placeholder="correo@ejemplo.com" value={requestData.email} onChange={handleRequestChange} required />
                </label>
                <div className="request-form-actions">
                  <button type="button" className="secondary-button" onClick={() => setShowRequestForm(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="primary-button" disabled={isRequestSubmitting}>
                    {isRequestSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
