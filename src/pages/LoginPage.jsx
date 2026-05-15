import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BRAND } from '../lib/brandConfig'

// Demo quick-access (set BRAND.demo.enabled = false in brandConfig.js for production)
const quickAccessUsers = BRAND.demo.enabled
  ? { client: BRAND.demo.client, admin: BRAND.demo.admin }
  : null

export function LoginPage() {
  const { session, login, isAuthenticated, isRefreshing, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulario de solicitud de acceso
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestData, setRequestData] = useState({
    businessName: '',
    contactName: '',
    taxId: '',
    phone: '',
    email: '',
    message: '',
  })

  const continueToPanel = () => {
    if (session?.role) {
      navigate(session.role === 'admin' ? '/admin' : '/cliente', { replace: true })
    }
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

  const handleQuickAccess = async (role) => {
    if (!quickAccessUsers) return
    const credentials = quickAccessUsers[role]
    setFormData(credentials)
    setError('')
    await submitLogin(credentials)
  }

  const handleRequestChange = (event) => {
    const { name, value } = event.target
    setRequestData((current) => ({ ...current, [name]: value }))
  }

  const handleRequestSubmit = async (event) => {
    event.preventDefault()
    setRequestError('')
    setIsRequestSubmitting(true)

    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })
      const result = await res.json()

      if (!result.ok) {
        setRequestError(result.message)
        return
      }

      setRequestSent(true)
    } catch {
      setRequestError('Error de conexión. Intentalo de nuevo.')
    } finally {
      setIsRequestSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand-lockup">
          <div className="brand-badge" aria-label={BRAND.name}>
            <p className="brand-overline">{BRAND.tagline}</p>
            <h1 className="brand-name-hero">{BRAND.name}</h1>
          </div>
          <p className="brand-copy">{BRAND.description}</p>
        </div>

        <div className="login-card">
          <div className="card-glow" aria-hidden="true"></div>

          {isAuthenticated && session?.role ? (
            <div className="login-resume-banner">
              <div>
                <p className="login-resume-eyebrow">Sesión activa</p>
                <p className="login-resume-name">
                  {session.name || session.email}
                  <span className="login-resume-role">
                    {session.role === 'admin' ? 'Administrador' : 'Cliente'}
                  </span>
                </p>
              </div>
              <div className="login-resume-actions">
                <button type="button" className="pill-button" onClick={() => logout()}>
                  Cerrar sesión
                </button>
                <button type="button" className="primary-button login-resume-cta" onClick={continueToPanel}>
                  Continuar al panel →
                </button>
              </div>
            </div>
          ) : null}

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

            <button type="submit" className="primary-button" disabled={isSubmitting || isRefreshing}>
              {isSubmitting || isRefreshing ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          {quickAccessUsers && (
            <div className="login-footer">
              <p>Acceso rápido de demo</p>
              <div className="quick-actions">
                <button
                  type="button"
                  className="pill-button"
                  onClick={() => handleQuickAccess('admin')}
                  disabled={isSubmitting || isRefreshing}
                >
                  Entrar como admin →
                </button>
                <button
                  type="button"
                  className="pill-button"
                  onClick={() => handleQuickAccess('client')}
                  disabled={isSubmitting || isRefreshing}
                >
                  Entrar como cliente →
                </button>
              </div>
            </div>
          )}

          <div className="login-request-card">
            <p className="login-request-eyebrow">Acceso mayorista</p>

            {!showRequestForm ? (
              <>
                <h3>¿Sos cliente mayorista?</h3>
                <p>
                  Solicitá acceso al portal. Revisamos tu solicitud y te habilitamos
                  la cuenta en menos de 24 horas.
                </p>
                <button
                  type="button"
                  className="login-request-button"
                  onClick={() => setShowRequestForm(true)}
                >
                  Solicitar acceso →
                </button>
              </>
            ) : requestSent ? (
              <div className="login-request-sent">
                <span className="login-request-sent-icon" aria-hidden="true">✓</span>
                <h3>¡Solicitud enviada!</h3>
                <p>
                  Recibimos tu solicitud. Nuestro equipo la va a revisar
                  y te contactamos a la brevedad para habilitarte el acceso.
                </p>
                <button
                  type="button"
                  className="login-request-button"
                  onClick={() => {
                    setShowRequestForm(false)
                    setRequestSent(false)
                    setRequestData({ businessName: '', contactName: '', taxId: '', phone: '', email: '', message: '' })
                  }}
                >
                  Volver al inicio
                </button>
              </div>
            ) : (
              <>
                <h3>Solicitar acceso al portal</h3>
                <form className="request-form" onSubmit={handleRequestSubmit}>
                  <label className="field">
                    <span>Nombre o Razón Social *</span>
                    <input
                      type="text"
                      name="businessName"
                      placeholder="Ej: Ferretería del Sur"
                      value={requestData.businessName}
                      onChange={handleRequestChange}
                      required
                    />
                  </label>

                  <label className="field">
                    <span>Nombre de contacto</span>
                    <input
                      type="text"
                      name="contactName"
                      placeholder="Tu nombre"
                      value={requestData.contactName}
                      onChange={handleRequestChange}
                    />
                  </label>

                  <label className="field">
                    <span>CUIT / RUT</span>
                    <input
                      type="text"
                      name="taxId"
                      placeholder="XX-XXXXXXXX-X"
                      value={requestData.taxId}
                      onChange={handleRequestChange}
                    />
                  </label>

                  <label className="field">
                    <span>Teléfono</span>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="11 1234 5678"
                      value={requestData.phone}
                      onChange={handleRequestChange}
                    />
                  </label>

                  <label className="field">
                    <span>Email *</span>
                    <input
                      type="email"
                      name="email"
                      placeholder="correo@ejemplo.com"
                      value={requestData.email}
                      onChange={handleRequestChange}
                      required
                    />
                  </label>

                  <label className="field">
                    <span>Mensaje (opcional)</span>
                    <textarea
                      name="message"
                      placeholder="Contanos brevemente qué productos necesitás o de dónde venís..."
                      value={requestData.message}
                      onChange={handleRequestChange}
                      rows={3}
                    />
                  </label>

                  {requestError ? <p className="form-error">{requestError}</p> : null}

                  <div className="request-form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setShowRequestForm(false)
                        setRequestError('')
                      }}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="primary-button" disabled={isRequestSubmitting}>
                      {isRequestSubmitting ? 'Enviando...' : 'Enviar solicitud'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
