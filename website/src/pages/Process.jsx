import React from 'react'
import './Process.css'

const Process = () => {
  return (
    <div className="process">
      <section className="section">
        <div className="container">
          <h1 className="section-title">How to Sell Your Cashew Seeds to Us</h1>
          <p className="process-intro">Selling your cashew seeds to Omototo is simple and straightforward. Follow these easy steps to get started:</p>
          
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Harvest & Prepare</h3>
                <p>Proper preparation ensures you get the best value for your cashew seeds. Follow these guidelines:</p>
                <ul>
                  <li>Harvest cashew nuts when they naturally fall from the tree</li>
                  <li>Remove the outer shell (cashew apple) within 24 hours</li>
                  <li>Dry the nuts in the sun for 2-3 days until moisture content is below 8%</li>
                  <li>Store in clean, dry bags away from moisture</li>
                </ul>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Bring to Our Warehouse</h3>
                <p>Visit our facility during our operating hours with your prepared cashew seeds:</p>
                <ul>
                  <li>Location: 123 Agriculture Street, Farming District</li>
                  <li>Hours: Monday-Friday: 8:00 AM - 5:00 PM, Saturday: 9:00 AM - 2:00 PM</li>
                  <li>Bring valid identification for first-time sellers</li>
                  <li>Have your produce ready for inspection</li>
                </ul>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Quality Assessment</h3>
                <p>Our trained experts will thoroughly assess your cashew seeds:</p>
                <ul>
                  <li>We weigh your produce accurately using calibrated scales</li>
                  <li>Inspect for moisture content, size, and defects</li>
                  <li>Grade according to our quality standards (A, B, or C)</li>
                  <li>Transparent process - you can observe the assessment</li>
                </ul>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Get a Quote</h3>
                <p>We provide an immediate, fair quote based on:</p>
                <ul>
                  <li>Current market prices for your grade of cashew seeds</li>
                  <li>Weight of your produce</li>
                  <li>Quality assessment results</li>
                  <li>No hidden fees or deductions</li>
                </ul>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>Receive Payment</h3>
                <p className="payment-guarantee">You receive immediate payment on the spot!</p>
                <ul>
                  <li>Payment via cash or bank transfer (your choice)</li>
                  <li>Transaction receipt provided for your records</li>
                  <li>No waiting - payment is made immediately after agreement on price</li>
                  <li>Secure transaction area for your safety</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="process-cta">
            <p>Ready to sell your cashew seeds to us?</p>
            <a href="/contact" className="btn">Contact Us Today</a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Process