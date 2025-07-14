import Layout from "./pages/Layout.jsx";

import Quote from "./pages/Quote.jsx";

import Negotiation from "./pages/Negotiation.jsx";

import Contracted from "./pages/Contracted.jsx";

import Reports from "./pages/Reports.jsx";

import ChartsPage from "./pages/ChartsPage.jsx";

import Users from "./pages/Users.jsx";

import TruckTypes from "./pages/TruckTypes.jsx";

import Carriers from "./pages/Carriers.jsx";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Quote: Quote,
    
    Negotiation: Negotiation,
    
    Contracted: Contracted,
    
    Reports: Reports,
    
    ChartsPage: ChartsPage,
    
    Users: Users,
    
    TruckTypes: TruckTypes,
    
    Carriers: Carriers,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Quote />} />
                
                
                <Route path="/Quote" element={<Quote />} />
                
                <Route path="/Negotiation" element={<Negotiation />} />
                
                <Route path="/Contracted" element={<Contracted />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/ChartsPage" element={<ChartsPage />} />
                
                <Route path="/Users" element={<Users />} />
                
                <Route path="/TruckTypes" element={<TruckTypes />} />
                
                <Route path="/Carriers" element={<Carriers />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}