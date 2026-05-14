import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// TODO: ocultar en producción real una vez salida la demo
const quickAccessUsers = {
  client: { email: 'cliente@amprev.com', password: 'cliente123' },
  admin: { email: 'admin@amprev.com', password: 'admin123' },
}

export function LoginPage() {
  const { session, login, register, isAuthenticated, isRefreshing } = useAuth()
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
  const [requestError, setRequestError] = useState('')
  const [requestData, setRequestData] = useState({
    nombre: '',
    cuit: '',
    telefono: '',
    email: '',
    password: '',
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

  const handleRequestSubmit = async (event) => {
    event.preventDefault()
    setRequestError('')
    setIsRequestSubmitting(true)

    try {
      const result = await register({
        name: requestData.nombre,
        businessName: requestData.nombre,
        taxId: requestData.cuit,
        phone: requestData.telefono,
        email: requestData.email,
        password: requestData.password,
      })

      if (!result.ok) {
        setRequestError(result.message)
        return
      }

      setRequestSent(true)
      navigate('/cliente', { replace: true })
    } finally {
      setIsRequestSubmitting(false)
    }
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
          <div className="brand-badge" aria-label="Nexoft">
            <p className="brand-overline">Soluciones tecnológicas para distribuidoras</p>
            <h1 className="brand-name-hero">Nexoft</h1>
          </div>
          <p className="brand-copy">Armamos y gestionamos soluciones tecnológicas para distribuidoras. Conectamos procesos, simplificamos operaciones y escalamos con el negocio.</p>
        </div>

        <div className="login-card">
          <div className="card-glow" aria-hidden="true"></div>
          <h2>Inicia sesion</h2>

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
              <span>Contrasena</span>
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
            <h3>Crea tu cuenta profesional</h3>

            {!showRequestForm ? (
              <>
                <p>
                  Si tenés una empresa o perfil profesional, creá tu cuenta
                  para acceder al portal mayorista.
                </p>
                <button
                  type="button"
                  className="login-request-button"
                  onClick={() => setShowRequestForm(true)}
                >
                  Crear cuenta profesional
                </button>
              </>
            ) : requestSent ? (
              <p style={{ color: '#10b981', fontWeight: '600', marginTop: '1rem' }}>
                Cuenta creada con exito. Redirigiendo a tu panel...
              </p>
            ) : (
              <form className="request-form" onSubmit={handleRequestSubmit}>
                <label className="field">
                  <span>Nombre o Razon Social</span>
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Pintureria Ej."
                    value={requestData.nombre}
                    onChange={handleRequestChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>CUIT / RUT</span>
                  <input
                    type="text"
                    name="cuit"
                    placeholder="XX-XXXXXXXX-X"
                    value={requestData.cuit}
                    onChange={handleRequestChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>Telefono</span>
                  <input
                    type="tel"
                    name="telefono"
                    placeholder="11 1234 5678"
                    value={requestData.telefono}
                    onChange={handleRequestChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>Email</span>
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
                  <span>Contrasena</span>
                  <input
                    type="password"
                    name="password"
                    placeholder="Minimo 6 caracteres"
                    value={requestData.password}
                    onChange={handleRequestChange}
                    minLength={6}
                    required
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
                    {isRequestSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
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
