import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PerformanceProvider } from './context/PerformanceContext';
import { Dashboard } from './pages/Dashboard';
import { ShapeGallery } from './pages/ShapeGallery';
import { Shape2DGallery } from './pages/Shape2DGallery';
import { ShapeBuilderPage } from './pages/ShapeBuilderPage';
import { PrizmaPage } from './pages/PrizmaPage';
import { PiramidaPage } from './pages/PiramidaPage';
import { SilindrPage } from './pages/SilindrPage';
import { KonusPage } from './pages/KonusPage';
import { SharPage } from './pages/SharPage';
import { KesikKonusPage } from './pages/KesikKonusPage';
import { UchburchakPage } from './pages/UchburchakPage';
import { TortburchakPage } from './pages/TortburchakPage';
import { KvadratPage } from './pages/KvadratPage';
import { DoiraPage } from './pages/DoiraPage';
import { TrapetsiyaPage } from './pages/TrapetsiyaPage';
import { ParallelogrammPage } from './pages/ParallelogrammPage';
import { RombPage } from './pages/RombPage';
import { MuntazamKoburchakPage } from './pages/MuntazamKoburchakPage';
import { LoginPage } from './pages/LoginPage';
import './styles/index.css';

function App() {
  // Nusxa olish va saqlashni bloklash
  useEffect(() => {
    // Klaviatura kombinatsiyalarini bloklash
    const handleKeyDown = (e) => {
      // Ctrl+S (saqlash), Ctrl+C (nusxa), Ctrl+A (tanlash), Ctrl+U (manba kodi), Ctrl+P (chop etish)
      if (e.ctrlKey && ['s', 'c', 'a', 'u', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect)
      if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
    };

    // O'ng tugmani bloklash (kontekst menyu)
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Matn tanlashni bloklash
    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Event listenerlarni qo'shish
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);

    // CSS orqali ham bloklash
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  return (
    <PerformanceProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/create-shape" element={<ShapeBuilderPage />} />
            <Route path="/3d-models" element={<ShapeGallery />} />
            <Route path="/3d-models/prizma" element={<PrizmaPage />} />
            <Route path="/3d-models/piramida" element={<PiramidaPage />} />
            <Route path="/3d-models/silindr" element={<SilindrPage />} />
            <Route path="/3d-models/konus" element={<KonusPage />} />
            <Route path="/3d-models/shar" element={<SharPage />} />
            <Route path="/3d-models/konus-kesma" element={<KesikKonusPage />} />
            <Route path="/2d-models" element={<Shape2DGallery />} />
            <Route path="/2d-models/uchburchak" element={<UchburchakPage />} />
            <Route path="/2d-models/tortburchak" element={<TortburchakPage />} />
            <Route path="/2d-models/kvadrat" element={<KvadratPage />} />
            <Route path="/2d-models/doira" element={<DoiraPage />} />
            <Route path="/2d-models/trapetsiya" element={<TrapetsiyaPage />} />
            <Route path="/2d-models/parallellogram" element={<ParallelogrammPage />} />
            <Route path="/2d-models/romb" element={<RombPage />} />
            <Route path="/2d-models/muntazam-koburchak" element={<MuntazamKoburchakPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PerformanceProvider>
  );
}

export default App;
