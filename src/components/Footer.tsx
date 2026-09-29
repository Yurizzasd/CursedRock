import { Link } from 'react-router-dom';
import { LogoMark } from './Logo';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo" style={{ marginBottom: 14 }}>
              <span className="logo-mark">
                <LogoMark />
              </span>
              <b>
                CURSED<span>ROCK</span>
              </b>
            </Link>
            <p>
              O catálogo underground de addons para Minecraft Bedrock. Curadoria manual, downloads
              diretos dos criadores e zero template genérico.
            </p>
          </div>
          <div>
            <h4>Explorar</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/addons">Todos os addons</Link></li>
              <li><Link to="/addons?sort=recent">Recentes</Link></li>
              <li><Link to="/addons?sort=updated">Atualizados</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 CURSEDROCK — feito no underground.</span>
          <span className="mc-note">
            Projeto de fãs. Sem afiliação com a Mojang ou Microsoft.
          </span>
        </div>
      </div>
    </footer>
  );
}
