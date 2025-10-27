import React from 'react';
    import { Link } from 'react-router-dom';
    import './Footer.css';

    function Footer() {
      return (
        <footer className="app-footer">
          <p>© 2025 - Proyecto de Tesis, Todos los derechos reservados.
            Este reporte es generado con fines académicos e informativos. No reemplaza la consulta, diagnóstico ni tratamiento médico profesional.
          </p>
          <Link to="/terminos-y-privacidad" className="footer-link">Ver Términos de Uso y Privacidad</Link>
        </footer>
      );
    }

    export default Footer;