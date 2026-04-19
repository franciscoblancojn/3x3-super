import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import './index.css'
import App from './App.tsx'
import { PagePrint } from './page/print';
import { PageDoc } from './page/doc/index.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/print" element={<PagePrint />} />
        <Route path="/doc" element={<PageDoc />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
