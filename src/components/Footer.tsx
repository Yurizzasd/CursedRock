import { Link } from 'react-router-dom';
import { LogoMark } from './Logo';
import { getAllCategories } from '../data/repository';

export function Footer() {
  const cats = getAllCategories().slice(0, 6);
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
              <li><Link to="/addons">Todos os addons</Link></li>
              <li><Link to="/categories">Categorias</Link></li>
              <li><Link to="/creators">Criadores</Link></li>
              <li><Link to="/favorites">Favoritos</Link></li>
              <li><Link to="/search?q=horror">Horror</Link></li>
            </ul>
          </div>
          <div>
            <h4>Categorias</h4>
            <ul>
              {cats.map((c) => (
                <li key={c.id}>
                  <Link to={`/category/${c.id}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>CursedRock</h4>
            <ul>
              <li><Link to="/creators">Para criadores</Link></li>
              <li><Link to="/addons?sort=updated">Atualizados</Link></li>
              <li><Link to="/addons?sort=popular">Populares</Link></li>
              <li><Link to="/search?q=">Busca avançada</Link></li>
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
