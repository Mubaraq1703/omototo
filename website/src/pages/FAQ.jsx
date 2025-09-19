import React from 'react'
import './FAQ.css'

const FAQ = () => {
  const faqData = [
    {
      question: "What are your current buying rates?",
      answer: "Our rates fluctuate based on market conditions and the quality of the cashew seeds. For today's best quote, please call us directly. We pride ourselves on offering competitive, fair prices that benefit both our business and our suppliers."
    },
    {
      question: "What are your opening hours?",
      answer: "We are open Monday through Friday from 8:00 AM to 5:00 PM, and on Saturdays from 9:00 AM to 2:00 PM. We are closed on Sundays and public holidays."
    },
    {
      question: "What is the minimum quantity you buy?",
      answer: "We buy from 1 bag upwards. There is no minimum quantity requirement - whether you have a small harvest or a large one, we are interested in purchasing your cashew seeds."
    },
    {
      question: "What packaging do you require?",
      answer: "We prefer cashew seeds to be brought in clean, dry jute or polypropylene bags. The bags should be properly sealed to prevent moisture absorption. We also accept bulk deliveries in trucks for large quantities."
    },
    {
      question: "Do you offer transportation/logistics?",
      answer: "We do not provide transportation services directly. However, we can recommend reliable transport providers in the region. For large bulk purchases, we can arrange for transportation at an additional cost."
    },
    {
      question: "How long does the quality assessment take?",
      answer: "The assessment process typically takes 15-30 minutes depending on the quantity. For large deliveries, it may take slightly longer. We prioritize efficiency without compromising on the thoroughness of our assessment."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We offer payment via cash or bank transfer. For first-time sellers, we may require a bank transfer for security purposes. Returning sellers can choose their preferred payment method."
    },
    {
      question: "Do you buy other agricultural products?",
      answer: "Currently, we specialize exclusively in raw cashew nuts. However, we are always exploring opportunities to expand our product range. Please contact us if you have suggestions or inquiries about other products."
    }
  ];

  return (
    <div className="faq">
      <section className="section">
        <div className="container">
          <h1 className="section-title">Frequently Asked Questions</h1>
          <p className="faq-intro">Find answers to common questions about selling your cashew seeds to Omototo Agro Allied Services.</p>
          
          <div className="faq-list">
            {faqData.map((item, index) => (
              <div className="faq-item" key={index}>
                <h3 className="faq-question">{item.question}</h3>
                <p className="faq-answer">{item.answer}</p>
              </div>
            ))}
          </div>
          
          <div className="faq-cta">
            <p>Didn't find the answer to your question?</p>
            <a href="/contact" className="btn">Contact Us Directly</a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FAQ