import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Gem, Menu, Search, X } from 'lucide-react';
import { useScrolled } from '../hooks/hooks';
import { getUpdatedAddons } from '../data/repository';
import { timeAgo } from '../utils/format';

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  if (compact) {
    return (
      <form className="searchbar" onSubmit={submit} role="search">
        <Search />
        <input
          type="search"
          placeholder="Buscar addons, criadores, tags…"
          aria-label="Buscar addons"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </form>
    );
  }

  return (
    <form className="searchbar" onSubmit={submit} role="search">
      <Search />
      <input
        type="search"
        placeholder="Buscar addons…"
        aria-label="Buscar addons"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <kbd>ENTER</kbd>
    </form>
  );
}

function NewsTicker() {
  const items = getUpdatedAddons(6);
  if (items.length === 0) return null;
  const row = (hidden: boolean) => (
    <>
      {items.map((a) => (
        <Link
          key={a.id}
          to={`/addon/${a.id}`}
          className="tick-item"
          aria-hidden={hidden}
          tabIndex={hidden ? -1 : undefined}
        >
          <b>{a.name}</b>
          <span className="tick-new">v{a.version}</span>
          <span>{timeAgo(a.updatedAt)}</span>
        </Link>
      ))}
    </>
  );
  return (
    <div className="headerticker" aria-label="Atualizações recentes">
      <div className="headerticker-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

export function Header({ favCount }: { favCount: number }) {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className={`header${scrolled ? ' scrolled' : ''}`}>
        <div className="header-inner">
          <Link to="/" className="logo" aria-label="CursedRock — início">
            <span className="logo-mark">
              <Gem />
            </span>
            <b>
              CURSED<span>ROCK</span>
            </b>
          </Link>
          <nav className="nav" aria-label="Navegação principal">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              Home
            </NavLink>
            <NavLink to="/addons" className={({ isActive }) => (isActive ? 'active' : '')}>
              Addons
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => (isActive ? 'active' : '')}>
              Categorias
            </NavLink>
            <NavLink to="/creators" className={({ isActive }) => (isActive ? 'active' : '')}>
              Criadores
            </NavLink>
            <NavLink to="/favorites" className={({ isActive }) => (isActive ? 'active' : '')}>
              Favoritos{favCount > 0 ? ` (${favCount})` : ''}
            </NavLink>
          </nav>
          <div className="header-search">
            <SearchBar compact />
          </div>
          <button
            className="hamburger"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <NewsTicker />
      </header>
      <div className={`mobile-menu${open ? ' open' : ''}`}>
        <div style={{ marginBottom: 10 }}>
          <SearchBar />
        </div>
        <NavLink to="/" end onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
          Home
        </NavLink>
        <NavLink to="/addons" onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
          Addons
        </NavLink>
        <NavLink to="/categories" onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
          Categorias
        </NavLink>
        <NavLink to="/creators" onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
          Criadores
        </NavLink>
        <NavLink to="/favorites" onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
          Favoritos{favCount > 0 ? ` (${favCount})` : ''}
        </NavLink>
      </div>
    </>
  );
}
