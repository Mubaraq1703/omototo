import React from 'react'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-info">
            <h3>Omototo Agro Allied Services</h3>
            <p>Your Trusted Partner in the Cashew Trade</p>
            <p>Buying Quality Cashew Seeds Direct from Farmers</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/services">Services</a></li>
              <li><a href="/process">Process</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h4>Contact Us</h4>
            <p>📍 123 Agriculture Street, Farming District</p>
            <p>📞 +1 (555) 123-4567</p>
            <p>✉️ info@omototo-agro.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Omototo Agro Allied Services. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer