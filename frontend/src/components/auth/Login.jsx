// src/components/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

// Esquemas de validación
const loginSchema = yup.object({
  dni: yup.string().required('El DNI es requerido'),
  password: yup.string().required('La contraseña es requerida'),
});

const registerSchema = yup.object({
  dni: yup.string().length(8, 'DNI debe tener 8 dígitos').required('DNI requerido'),
  first_name: yup.string().required('Nombre requerido'),
  last_name: yup.string().required('Apellido requerido'),
  phone: yup.string().required('Teléfono requerido'),
  parent_name: yup.string().required('Nombre apoderado requerido'),
  parent_phone: yup.string().required('Teléfono apoderado requerido'),
  password: yup.string().min(6, 'Mínimo 6 caracteres').required('Contraseña requerida'),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [isActive, setIsActive] = useState(false); // Toggle entre Login/Register
  const [showRules, setShowRules] = useState(false); // Modal de normas
  const [notification, setNotification] = useState(null); // Estado para notificaciones

  // Función para mostrar notificaciones temporales
  const showNotification = (type, title, message) => {
    setNotification({ type, title, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'register') {
      setIsActive(true);
    }
  }, [location]);

  // Formulario de Login
  const loginFormik = useFormik({
    initialValues: { dni: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      try {
        const data = await login(values.dni, values.password);
        showNotification('success', '¡Bienvenido!', 'Iniciando sesión...');
        
        // Pequeño delay para ver la animación antes de redirigir
        setTimeout(() => {
          const role = data.user.role;
          if (role === 'admin') navigate('/admin/dashboard');
          else if (role === 'student') navigate('/student/dashboard');
          else if (role === 'teacher') navigate('/teacher/dashboard');
        }, 1000);

      } catch (err) {
        showNotification('error', 'Error de Acceso', err.message || 'Credenciales incorrectas');
      }
    },
  });

  // Formulario de Registro
  const registerFormik = useFormik({
    initialValues: {
      dni: '', first_name: '', last_name: '', phone: '',
      parent_name: '', parent_phone: '', password: '',
    },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      try {
        const response = await fetch('http://localhost:4000/api/students/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        const data = await response.json();
        
        if (response.ok) {
          // EN LUGAR DE ALERT, MOSTRAMOS NORMAS
          setShowRules(true); 
          registerFormik.resetForm();
        } else {
          showNotification('error', 'Error de Registro', data.message || 'No se pudo crear la cuenta');
        }
      } catch (err) {
        showNotification('error', 'Error de Conexión', 'Intente nuevamente más tarde');
      }
    },
  });

  const handleAcceptRules = () => {
    setShowRules(false);
    setIsActive(false); // Cambiar a panel de Login
    showNotification('success', '¡Registro Exitoso!', 'Ahora puedes iniciar sesión');
  };

  return (
    <div className="auth-page">
      <a href="/" className="back-to-home">← Volver al Inicio</a>

      {/* Componente de Notificación Flotante */}
      {notification && (
        <div className="notification-container">
          <div className={`notification-card ${notification.type}`}>
            <div className="notification-icon">
              {notification.type === 'success' ? '✅' : '⛔'}
            </div>
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Normas Institucionales */}
      {showRules && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📜 Normas Institucionales</h2>
            </div>
            <div className="modal-body">
              <p>¡Bienvenido a la Academia Unión de Nuevos Inteligentes! Para completar tu registro, por favor lee y acepta nuestros compromisos:</p>
              
              <h3>1. Asistencia y Puntualidad</h3>
              <ul>
                <li>La tolerancia de ingreso es de 10 minutos.</li>
                <li>La inasistencia injustificada será reportada al apoderado.</li>
              </ul>

              <h3>2. Conducta Académica</h3>
              <ul>
                <li>Respeto mutuo entre estudiantes y docentes.</li>
                <li>Uso adecuado de las instalaciones y plataforma virtual.</li>
              </ul>

              <h3>3. Compromiso</h3>
              <ul>
                <li>Cumplir con las evaluaciones y tareas asignadas.</li>
                <li>Mantener el orden y limpieza en las aulas.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn-accept" onClick={handleAcceptRules}>
                He leído y Acepto las Normas
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`auth-container ${isActive ? 'active' : ''}`}>
        
        {/* Sign In Form */}
        <div className="form-container sign-in">
          <form onSubmit={loginFormik.handleSubmit}>
            <h1>Iniciar Sesión</h1>
            <input
              type="text"
              placeholder="DNI"
              name="dni"
              {...loginFormik.getFieldProps('dni')}
              className={loginFormik.touched.dni && loginFormik.errors.dni ? 'input-error' : ''}
            />
            {loginFormik.touched.dni && loginFormik.errors.dni && (
              <div className="error-message">{loginFormik.errors.dni}</div>
            )}
            
            <input
              type="password"
              placeholder="Contraseña"
              name="password"
              {...loginFormik.getFieldProps('password')}
              className={loginFormik.touched.password && loginFormik.errors.password ? 'input-error' : ''}
            />
            {loginFormik.touched.password && loginFormik.errors.password && (
              <div className="error-message">{loginFormik.errors.password}</div>
            )}
            
            <button type="submit">Iniciar Sesión</button>
          </form>
        </div>

        {/* Sign Up Form */}
        <div className="form-container sign-up">
          <form onSubmit={registerFormik.handleSubmit}>
            <h1>Crear Cuenta</h1>
            <div className="form-grid">
              <div>
                <input
                  type="text"
                  placeholder="DNI"
                  name="dni"
                  {...registerFormik.getFieldProps('dni')}
                  className={registerFormik.touched.dni && registerFormik.errors.dni ? 'input-error' : ''}
                />
                 {registerFormik.touched.dni && registerFormik.errors.dni && (
                  <div className="error-message">{registerFormik.errors.dni}</div>
                )}
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  name="password"
                  {...registerFormik.getFieldProps('password')}
                  className={registerFormik.touched.password && registerFormik.errors.password ? 'input-error' : ''}
                />
                {registerFormik.touched.password && registerFormik.errors.password && (
                  <div className="error-message">{registerFormik.errors.password}</div>
                )}
              </div>

              <input
                type="text"
                placeholder="Nombres"
                name="first_name"
                {...registerFormik.getFieldProps('first_name')}
              />
              <input
                type="text"
                placeholder="Apellidos"
                name="last_name"
                {...registerFormik.getFieldProps('last_name')}
              />
              <input
                type="text"
                placeholder="Teléfono"
                name="phone"
                {...registerFormik.getFieldProps('phone')}
              />
              <input
                type="text"
                placeholder="Nombre del Apoderado"
                name="parent_name"
                {...registerFormik.getFieldProps('parent_name')}
              />
              <div style={{gridColumn: '1 / -1'}}>
                 <input
                  type="text"
                  placeholder="Teléfono del Apoderado"
                  name="parent_phone"
                  {...registerFormik.getFieldProps('parent_phone')}
                />
              </div>
            </div>
            
            {/* Mensajes de error generales del formulario */}
            {(Object.keys(registerFormik.errors).length > 0 && registerFormik.touched.dni) && (
                 <div className="error-message" style={{textAlign: 'center', marginBottom: '10px'}}>
                    Por favor completa todos los campos correctamente.
                 </div>
            )}

            <button type="submit">Registrarse</button>
          </form>
        </div>

        {/* Toggle Container */}
        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
              <h1>¡Bienvenido de Nuevo!</h1>
              <p>Ingresa tus datos personales para acceder a todas las funciones de la academia</p>
              <button className="hidden" onClick={() => setIsActive(false)}>
                Iniciar Sesión
              </button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1>¡Hola, Estudiante!</h1>
              <p>Regístrate con tus datos personales para comenzar tu camino hacia el éxito</p>
              <button className="hidden" onClick={() => setIsActive(true)}>
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;