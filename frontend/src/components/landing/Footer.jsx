// src/components/landing/Footer.jsx
import './LandingPage.css';

const Footer = () => {
    return (
        <footer className="landing-footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h3>Acerca de Nosotros</h3>
                    <p>Academia Unión de Nuevos Inteligentes - La mejor academia de preparación universitaria en Cusco. Formando a los mejores estudiantes desde 2020.</p>
                </div>

                <div className="footer-section">
                    <h3>Enlaces Rápidos</h3>
                    <ul>
                        <li><a href="#about">Acerca de</a></li>
                        <li><a href="#courses">Nuestros Cursos</a></li>
                        <li><a href="#teachers">Docentes</a></li>
                        <li><a href="#testimonials">Testimonios</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Legal</h3>
                    <ul>
                        <li><a href="#terms">Términos y Condiciones</a></li>
                        <li><a href="#privacy">Política de Privacidad</a></li>
                        <li><a href="#cookies">Política de Cookies</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Contacto</h3>
                    <ul>
                        <li>📧 info@academiauni.edu.pe</li>
                        <li>📱 +51 984 123 456</li>
                        <li>📍 Av Torrechayoc N° 123, Cusco</li>
                    </ul>
                    <div className="social-links">
                        <a href="#facebook" aria-label="Facebook">📘</a>
                        <a href="#instagram" aria-label="Instagram">📷</a>
                        <a href="#youtube" aria-label="YouTube">📺</a>
                        <a href="#tiktok" aria-label="TikTok">🎵</a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; 2024 Academia Unión de Nuevos Inteligentes. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
};

export default Footer;
