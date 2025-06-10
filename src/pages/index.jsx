import Layout from "./Layout.jsx";

import Quote from "./Quote";

import Negotiation from "./Negotiation";

import Contracted from "./Contracted";

import Reports from "./Reports";

import ChartsPage from "./ChartsPage";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Quote: Quote,
    
    Negotiation: Negotiation,
    
    Contracted: Contracted,
    
    Reports: Reports,
    
    ChartsPage: ChartsPage,
    
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