import React from 'react';
import { Link } from 'react-router-dom';
import { CustomShapeBuilder } from '../components/CustomShapeBuilder';
import { UserMenu } from '../components/UserMenu';

export function ShapeBuilderPage() {
    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <div className="nav-logo">
                    <Link to="/" className="header-logo-link" title="Bosh sahifa">
                        <img src="/logo.png" alt="NovaTex Logo" className="header-logo-img" />
                    </Link>
                    <span className="gradient-text">NovaTex</span>
                </div>
                <UserMenu />
            </nav>
            
            <div className="page-header" style={{ marginBottom: '20px' }}>
                <Link to="/" className="back-btn" style={{ display: 'inline-flex', width: 'fit-content' }}>
                    <span>← Ortga</span>
                </Link>
            </div>

            <CustomShapeBuilder />
        </div>
    );
}
