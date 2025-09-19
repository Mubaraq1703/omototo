import React from 'react'
import './About.css'

const About = () => {
  return (
    <div className="about">
      <section className="section">
        <div className="container">
          <h1 className="section-title">About Omototo Agro Allied Services</h1>
          <div className="about-content">
            <div className="about-text">
              <h2>Our Story</h2>
              <p>Founded in 2010, Omototo Agro Allied Services began with a simple mission: to empower local farmers by offering competitive prices and a reliable outlet for their cashew produce. Over the years, we have grown to become a trusted partner in the cashew trade, known for our integrity, fairness, and commitment to quality.</p>
              <p>Our journey started when we recognized the challenges farmers faced in getting fair value for their hard-earned produce. Many were underserved by middlemen who offered low prices and operated without transparency. We decided to change that by establishing a direct, fair-trade relationship with farmers.</p>
              
              <h2>Our Mission</h2>
              <p>To provide a transparent, efficient, and profitable market for cashew farmers while maintaining the highest standards of quality and service in the agricultural trade.</p>
              
              <h2>Our Vision</h2>
              <p>To be the leading cashew seed warehouse in the region, recognized for our commitment to farmer welfare, quality excellence, and sustainable agricultural practices.</p>
            </div>
            
            <div className="about-image">
              <div className="placeholder-image">Team Photo</div>
            </div>
          </div>
          
          <div className="why-choose-us">
            <h2 className="section-title">Why Choose Omototo</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3>Fair & Competitive Pricing</h3>
                <p>We offer market-driven prices that ensure farmers get the best value for their produce.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Instant Payment</h3>
                <p>No waiting - you receive payment immediately after quality assessment.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h3>Quality Assessment Experts</h3>
                <p>Our trained professionals ensure fair and accurate grading of your cashew seeds.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏢</div>
                <h3>Modern Storage Facilities</h3>
                <p>Our facility maintains optimal conditions to preserve the quality of your produce.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📜</div>
                <h3>Trusted & Licensed</h3>
                <p>We operate with all necessary licenses and are trusted by farmers across the region.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🤝</div>
                <h3>Personal Relationship</h3>
                <p>We build lasting relationships with our suppliers based on trust and mutual respect.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About