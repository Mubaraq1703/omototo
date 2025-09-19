import React, { useState } from 'react'
import './Contact.css'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real application, you would send this data to your server
    alert('Thank you for your message! We will contact you soon.');
    setFormData({ name: '', phone: '', message: '' });
  };

  return (
    <div className="contact">
      <section className="section">
        <div className="container">
          <h1 className="section-title">Contact Us</h1>
          
          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-card">
                <div className="contact-icon">📍</div>
                <h3>Our Location</h3>
                <p>123 Agriculture Street</p>
                <p>Farming District, AG 12345</p>
                <a href="#" className="btn">Get Directions</a>
              </div>
              
              <div className="contact-card">
                <div className="contact-icon">📞</div>
                <h3>Call Us</h3>
                <p>+1 (555) 123-4567</p>
                <p>Monday-Friday: 8:00 AM - 5:00 PM</p>
                <p>Saturday: 9:00 AM - 2:00 PM</p>
              </div>
              
              <div className="contact-card">
                <div className="contact-icon">✉️</div>
                <h3>Email Us</h3>
                <p>info@omototo-agro.com</p>
                <p>We'll respond within 24 hours</p>
              </div>
            </div>
            
            <div className="map-container">
              <div className="map-placeholder">
                Google Maps Embed Would Go Here
              </div>
            </div>
            
            <div className="contact-form-section">
              <h2>Send Us a Message</h2>
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    value={formData.name}
                    onChange={handleChange}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    value={formData.phone}
                    onChange={handleChange}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows="5" 
                    value={formData.message}
                    onChange={handleChange}
                    required 
                  ></textarea>
                </div>
                
                <button type="submit" className="btn">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Contact