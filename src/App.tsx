import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Addons } from './pages/Addons';
import { AddonDetail } from './pages/AddonDetail';
import { SearchPage } from './pages/Search';
import { Categories, CategoryDetail } from './pages/Categories';
import { Creators, CreatorDetail } from './pages/Creators';
import { Favorites } from './pages/Favorites';
import { NotFound } from './pages/NotFound';
import { useFavorites } from './hooks/useFavorites';

export default function App() {
  const { favorites, toggle, clear } = useFavorites();

  return (
    <BrowserRouter>
      <Header favCount={favorites.length} />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/addons" element={<Addons favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/addon/:slug" element={<AddonDetail favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/search" element={<SearchPage favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:slug" element={<CategoryDetail favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/creator/:slug" element={<CreatorDetail favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/favorites" element={<Favorites favorites={favorites} onToggleFavorite={toggle} onClear={clear} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
