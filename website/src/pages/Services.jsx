import React from 'react'
import './Services.css'

const Services = () => {
  return (
    <div className="services">
      <section className="section">
        <div className="container">
          <h1 className="section-title">Our Services</h1>
          <div className="services-content">
            <div className="service-intro">
              <p>Omototo Agro Allied Services specializes in the purchase of high-quality raw cashew nuts (RCN) directly from farmers and traders. We are committed to providing a transparent and profitable market for all our suppliers.</p>
              <p className="highlight">We buy from both individual farmers and large-scale traders.</p>
            </div>
            
            <div className="cashew-types">
              <h2>Types of Cashew We Buy</h2>
              <div className="types-grid">
                <div className="type-card">
                  <h3>Raw Cashew Nuts (RCN)</h3>
                  <p>We purchase raw cashew nuts in their shells, ready for processing.</p>
                </div>
                <div className="type-card">
                  <h3>Grade A Cashew</h3>
                  <p>Premium quality cashew nuts with minimal defects and optimal moisture content.</p>
                </div>
                <div className="type-card">
                  <h3>Grade B Cashew</h3>
                  <p>Good quality cashew nuts with acceptable levels of defects.</p>
                </div>
                <div className="type-card">
                  <h3>Grade C Cashew</h3>
                  <p>Standard quality cashew nuts suitable for processing.</p>
                </div>
              </div>
            </div>
            
            <div className="quality-standards">
              <h2>Our Quality Standards</h2>
              <p>To ensure fair pricing for all suppliers, we assess cashew nuts based on the following criteria:</p>
              <ul>
                <li><strong>Moisture Content:</strong> Maximum 8% moisture content for optimal storage and processing</li>
                <li><strong>Size:</strong> We categorize by size with larger nuts (W180, W210, W240, W320, W450) commanding higher prices</li>
                <li><strong>Defects:</strong> Minimal broken, discolored, or insect-damaged nuts (less than 5% defects for Grade A)</li>
                <li><strong>Purity:</strong> Free from foreign materials, stones, or other contaminants (99% purity minimum)</li>
                <li><strong>Freshness:</strong> Recently harvested nuts with no signs of mold or rancidity</li>
              </ul>
            </div>
            
            <div className="pricing-info">
              <h2>Pricing Information</h2>
              <p>Our pricing is based on current market conditions and the quality of the cashew nuts. We strive to offer competitive rates that benefit both our business and our suppliers.</p>
              <div className="pricing-box">
                <p><strong>Current Pricing Model:</strong> Competitive Market-Driven Prices</p>
                <p>Prices fluctuate based on regional and international market trends. For today's best quote, please contact us directly.</p>
                <a href="/contact" className="btn">Get Today's Price Quote</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Services