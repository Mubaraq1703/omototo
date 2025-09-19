import React from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

const Home = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Your Trusted Partner in the Cashew Trade</h1>
          <p>Omototo Agro Allied Services is a leading cashew seed warehouse providing a fair, transparent, and efficient market for local farmers and traders.</p>
          <div className="hero-buttons">
            <Link to="/process" className="btn">Sell Your Cashew Seeds</Link>
            <Link to="/contact" className="btn btn-secondary">Contact Us Today</Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section features">
        <div className="container">
          <h2 className="section-title">Why Choose Omototo</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Fair & Competitive Pricing</h3>
              <p>We offer the best market-driven prices for quality cashew seeds.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Payment</h3>
              <p>Receive immediate payment on the spot after quality assessment.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Quality Assessment Experts</h3>
              <p>Our trained experts ensure fair and accurate grading of your produce.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏢</div>
              <h3>Modern Storage Facilities</h3>
              <p>State-of-the-art storage to preserve the quality of your cashew seeds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="section services-preview">
        <div className="container">
          <h2 className="section-title">Our Services</h2>
          <div className="services-content">
            <p>We specialize in buying raw cashew nuts (RCN) directly from farmers and traders. Our quality standards ensure that we purchase only the best produce that meets market requirements.</p>
            <p className="highlight">We buy from both individual farmers and large-scale traders.</p>
            <Link to="/services" className="btn">Learn More About Our Services</Link>
          </div>
        </div>
      </section>

      {/* Process Preview */}
      <section className="section process-preview">
        <div className="container">
          <h2 className="section-title">Our Simple Process</h2>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <h3>Harvest & Prepare</h3>
              <p>Dry and properly bag your cashew seeds according to our guidelines.</p>
            </div>
            <div className="process-step">
              <div className="step-number">2</div>
              <h3>Bring to Our Warehouse</h3>
              <p>Visit our facility during operating hours with your produce.</p>
            </div>
            <div className="process-step">
              <div className="step-number">3</div>
              <h3>Quality Assessment</h3>
              <p>Our experts will weigh and inspect your cashew seeds.</p>
            </div>
            <div className="process-step">
              <div className="step-number">4</div>
              <h3>Get Paid Immediately</h3>
              <p>Receive instant payment based on quality and weight.</p>
            </div>
          </div>
          <div className="process-cta">
            <Link to="/process" className="btn">View Full Process</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home