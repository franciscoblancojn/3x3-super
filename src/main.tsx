import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import './index.css'
import App from './App.tsx'
import { PagePrint } from './page/print';
import { PageDoc } from './page/doc/index.tsx';
import { PagePrintFront } from './page/print/front/index.tsx';
import { PagePrintBack } from './page/print/back/index.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/print" element={<PagePrint />} />
        <Route path="/print/front" element={<PagePrintFront />} />
        <Route path="/print/back" element={<PagePrintBack />} />
        <Route path="/doc" element={<PageDoc />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
